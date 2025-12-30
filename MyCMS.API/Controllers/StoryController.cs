using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs; // ✅ 修正這裡
using MyCMS.API.Services;
using MyCMS.API.Models;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoryController : ControllerBase
{
    private readonly StoryService _storyService;

    public StoryController(StoryService storyService)
    {
        _storyService = storyService;
    }

    // Step 1: 生成文字草稿 (快速)
    [HttpPost("draft")]
    public async Task<ActionResult<StoryDraftDto>> GenerateDraft([FromBody] GenerateScriptRequest request)
    {
        if (string.IsNullOrEmpty(request.Topic)) return BadRequest("請輸入主題");

        try 
        {
            var draft = await _storyService.GenerateScriptAsync(request);
            return Ok(draft);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"生成草稿失敗: {ex.Message}");
        }
    }

    // Step 2: 定稿並生成圖片 (慢速，需等待)
    [HttpPost("finalize")]
    public async Task<IActionResult> FinalizeStory([FromBody] FinalizeStoryRequest request)
    {
        if (request.Pages == null || request.Pages.Count == 0) return BadRequest("沒有頁面內容");

        try
        {
            // 這裡會回傳生成的 Book 物件 (包含圖片路徑)
            var book = await _storyService.CreateBookFromDraftAsync(request);
            return Ok(book);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"生成繪本失敗: {ex.Message}");
        }
    }

    // ... 原有的 GenerateStory 方法 ...

    // 新增：根據 ID 取得故事內容 (GET: api/story/1)
    [HttpGet("{id}")]
    public IActionResult GetStory(int id)
    {
        // TODO: 這裡應該要從資料庫 _context.Books.Include(b => b.Pages).FirstOrDefault(b => b.Id == id);
        // 現在為了演示，我們先回傳一個「假資料」，讓你前端能測試
        
        var mockPages = new List<BookPage>
        {
            new BookPage { 
                PageIndex = 1, 
                Content = "很久很久以前，有一隻勇敢的小貓咪叫做咪咪。牠最大的夢想就是飛到火星上去抓老鼠。", 
                ImagePath = "uploads/demo_cat_1.png" // 請確保 wwwroot/uploads 有這張圖，或是先隨便放一張
            },
            new BookPage { 
                PageIndex = 2, 
                Content = "有一天，咪咪在後院發現了一個巨大的紙箱。牠心想：「這就是我的太空船！」於是牠開始動手改裝。", 
                ImagePath = "uploads/demo_cat_2.png" 
            },
            new BookPage { 
                PageIndex = 3, 
                Content = "咪咪戴上了魚缸當作太空頭盔，倒數三、二、一！紙箱太空船轟隆隆地發動了（雖然只是牠自己在搖晃）。", 
                ImagePath = "uploads/demo_cat_3.png" 
            },
            new BookPage { 
                PageIndex = 4, 
                Content = "雖然最後沒有飛到火星，但咪咪在夢裡已經去過了。牠在紙箱裡睡得很香甜。", 
                ImagePath = "uploads/demo_cat_4.png" 
            }
        };

        return Ok(mockPages);
    }
}