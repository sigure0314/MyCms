using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class StoryService
{
    private readonly IGeminiClient _gemini;       // ✅ 保留：負責跟 AI 講話
    private readonly IImageGenerator _imagen;     // ✅ 保留：負責畫圖
    private readonly Supabase.Client _supabase;   // ✅ 新增：負責存到雲端 (取代 IWebHostEnvironment)
    private readonly AppDbContext _context;       // ✅ 保留：負責存資料庫

    public StoryService(
        IGeminiClient gemini,
        IImageGenerator imagen,
        Supabase.Client supabase,
        AppDbContext context)
    {
        _gemini = gemini;
        _imagen = imagen;
        _supabase = supabase;
        _context = context;
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

        // B. 處理每一頁 (使用 Task 來並行處理，加快速度)
        var pageTasks = draft.Pages.Select(async (pageDto) =>
        {
            // --- 步驟 1: 生成圖片 (Generate) ---
            // 這裡會等待圖片完全生成完畢，拿到二進位檔 (byte[]) 才會往下走
            byte[] imgBytes = await _imagen.GenerateImageAsync(pageDto.ImagePrompt);

            // --- 步驟 2: 檢查圖片是否有效 (Validation) ---
            // 如果生成失敗或拿到空檔案，就拋出錯誤，阻止後續上傳
            if (imgBytes == null || imgBytes.Length == 0)
            {
                throw new Exception($"第 {pageDto.PageIndex} 頁圖片生成失敗，停止上傳。");
            }

            // --- 步驟 3: 上傳到 Supabase (Upload) ---
            // 只有上面的步驟成功，才會執行這裡
            string fileName = $"book_{newBook.Id}/page_{pageDto.PageIndex}_{Guid.NewGuid().ToString()[..6]}.jpg";
            
            await _supabase.Storage
                .From("story-images") // 確保 Supabase Storage 有這個 Bucket
                .Upload(imgBytes, fileName, new Supabase.Storage.FileOptions { Upsert = true });

            // --- 步驟 4: 回傳準備寫入 DB 的物件 ---
            return new BookPage
            {
                BookId = newBook.Id,
                PageIndex = pageDto.PageIndex,
                Content = pageDto.Content,
                ImagePrompt = pageDto.ImagePrompt,
                ImagePath = fileName // 存入資料庫的是 Supabase 裡的路徑
            };
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
            _context.Books.Remove(newBook);
            await _context.SaveChangesAsync();
            
            throw new Exception($"製作繪本失敗，已復原資料。錯誤原因: {ex.Message}");
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
