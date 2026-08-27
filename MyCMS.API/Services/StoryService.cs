using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class StoryService
{
    private readonly IGeminiClient _gemini;       // ✅ 保留：負責跟 AI 講話
    private readonly IImageGenerator _imageGenerator; // ✅ 保留：負責畫圖
    private readonly Supabase.Client _supabase;   // ✅ 新增：負責存到雲端 (取代 IWebHostEnvironment)
    private readonly AppDbContext _context;       // ✅ 保留：負責存資料庫
    private readonly ILogger<StoryService> _logger;
    private readonly string _storyBucketName;

    public StoryService(
        IGeminiClient gemini,
        IImageGenerator imageGenerator,
        Supabase.Client supabase,
        AppDbContext context,
        ILogger<StoryService> logger,
        IConfiguration configuration)
    {
        _gemini = gemini;
        _imageGenerator = imageGenerator;
        _supabase = supabase;
        _context = context;
        _logger = logger;
        _storyBucketName = string.IsNullOrWhiteSpace(configuration["Supabase:BucketName"])
            ? "story"
            : configuration["Supabase:BucketName"]!.Trim();
    }

    // ==========================================
    // 1. 產生草稿 (Draft) - 呼叫 Gemini
    // ==========================================
    public async Task<StoryDraftDto> GenerateScriptAsync(GenerateScriptRequest request)
    {
       // 1. Prompt (建議加強語氣：不要廢話)
        var prompt = $@"
        你是一位專業的童書作家。請為 {request.Age} 歲的兒童創作一個關於「{request.Topic}」的故事。
        要求：{request.Pages} 頁，JSON 格式，包含 title, summary, pages (content, imagePrompt)。
        絕對不要包含任何 Markdown 標記 (如 ```json) 或開頭結尾的招呼語，直接回傳純 JSON 字串。
        ";

        // 2. 呼叫 Gemini
        string rawResponse = await _gemini.GenerateTextAsync(prompt); 

        // 3. ✨✨✨ 強力清洗邏輯 (修復 0xE5 錯誤的關鍵) ✨✨✨
        var cleanJson = ExtractJson(rawResponse);

        // 4. 反序列化
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<StoryDraftDto>(cleanJson, options) 
               ?? new StoryDraftDto();
    }

    // ==========================================
    // 2. 定稿出版 (Finalize) - 畫圖 + 上傳 Supabase
    // ==========================================
    public async Task<Book> CreateBookFromDraftAsync(FinalizeStoryRequest draft)
    {
        // A. 先建書本資料 (為了取得 BookId 來當資料夾名稱)
        var newBook = new Book
        {
            Title = draft.Title,
            ViewCount = 0,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.Books.Add(newBook);
        await _context.SaveChangesAsync(); // 執行後 newBook.Id 就有值了 (例如: 5)

        // Cloudflare free-tier requests are serialized to reduce upstream 429 responses.
        using var imageGenerationGate = new SemaphoreSlim(1, 1);

        // B. 圖片生成逐張執行；完成後的 Supabase upload 仍可與下一張生成重疊。
        var pageTasks = draft.Pages.Select(async (pageDto) =>
        {
            var stage = "image-generation";
            try
            {
                if (string.IsNullOrWhiteSpace(pageDto.ImagePrompt))
                {
                    throw new InvalidOperationException("頁面缺少圖片生成 prompt。");
                }

                // --- 步驟 1: 生成圖片 (Generate) ---
                // 這裡會等待圖片完全生成完畢，拿到二進位檔 (byte[]) 才會往下走
                byte[] imgBytes;
                await imageGenerationGate.WaitAsync();
                try
                {
                    imgBytes = await _imageGenerator.GenerateImageAsync(pageDto.ImagePrompt);
                }
                finally
                {
                    imageGenerationGate.Release();
                }

                // --- 步驟 2: 檢查圖片是否有效 (Validation) ---
                // 如果生成失敗或拿到空檔案，就拋出錯誤，阻止後續上傳
                if (imgBytes == null || imgBytes.Length == 0)
                {
                    throw new InvalidOperationException("圖片服務回傳空白圖片。");
                }

                // --- 步驟 3: 上傳到 Supabase (Upload) ---
                // 只有上面的步驟成功，才會執行這裡
                stage = "supabase-upload";
                string fileName = $"book_{newBook.Id}/page_{pageDto.PageIndex}_{Guid.NewGuid().ToString()[..6]}.jpg";

                await _supabase.Storage
                    .From(_storyBucketName)
                    .Upload(imgBytes, fileName, new Supabase.Storage.FileOptions { Upsert = true });

                _logger.LogInformation(
                    "Story page image completed. BookId={BookId}, PageIndex={PageIndex}, Bucket={Bucket}, ImageBytes={ImageBytes}",
                    newBook.Id, pageDto.PageIndex, _storyBucketName, imgBytes.Length);

                // --- 步驟 4: 回傳準備寫入 DB 的物件 ---
                return new BookPage
                {
                    BookId = newBook.Id,
                    PageIndex = pageDto.PageIndex,
                    Content = pageDto.Content,
                    ImagePrompt = pageDto.ImagePrompt,
                    ImagePath = fileName // 存入資料庫的是 Supabase 裡的路徑
                };
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "Story page processing failed. BookId={BookId}, PageIndex={PageIndex}, Stage={Stage}",
                    newBook.Id, pageDto.PageIndex, stage);
                throw;
            }
        });

        try 
        {
            // 等待所有頁面都處理完成
            var bookPages = await Task.WhenAll(pageTasks);

            // C. 全部成功後，才寫入 Pages 資料表
            _context.BookPages.AddRange(bookPages);
            await _context.SaveChangesAsync();

            // 組裝回傳
            newBook.Pages = bookPages.OrderBy(p => p.PageIndex).ToList();
            return newBook;
        }
        catch (Exception ex)
        {
            // 如果生成過程中發生錯誤 (例如某張圖生成失敗)，
            // 建議把剛剛建立的「空書殼」刪掉，避免資料庫留下一本沒有頁面的書
            try
            {
                _context.Books.Remove(newBook);
                await _context.SaveChangesAsync();
            }
            catch (Exception cleanupException)
            {
                _logger.LogError(
                    cleanupException,
                    "Failed to remove incomplete story book. BookId={BookId}",
                    newBook.Id);
            }

            _logger.LogError(ex, "Story finalization failed. BookId={BookId}", newBook.Id);
            throw new InvalidOperationException("製作繪本失敗，已復原未完成的書本資料。", ex);
        }
        
    }
    // 👇 把這個私有輔助方法加在 StoryService 類別最下方
    private string ExtractJson(string source)
    {
        if (string.IsNullOrWhiteSpace(source)) return "{}";

        // 找到第一個 '{'
        int startIndex = source.IndexOf('{');
        // 找到最後一個 '}'
        int endIndex = source.LastIndexOf('}');

        if (startIndex >= 0 && endIndex > startIndex)
        {
            // 只擷取 { ... } 中間的部分
            return source.Substring(startIndex, endIndex - startIndex + 1);
        }

        // 如果完全找不到括號，可能是 AI 講了一堆廢話但沒給 JSON，或是格式全錯
        // 這裡可以選擇拋出錯誤，或是回傳空物件
        Console.WriteLine($"[JSON 解析失敗] 原始回應: {source}"); // 方便除錯
        throw new Exception("AI 回傳的內容不包含有效的 JSON 區塊");
    }
}
