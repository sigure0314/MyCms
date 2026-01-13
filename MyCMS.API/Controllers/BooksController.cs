using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.Models;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // 鎖定只有登入的使用者才能存取
public class BooksController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly string _supabaseUrl;
    private readonly string _bucketName;

    // 透過建構子注入 DbContext 與 Configuration
    public BooksController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        
        // 從 appsettings.json 讀取 Supabase 設定
        // 如果沒設定，給一個預設值避免程式掛掉，但建議一定要在 appsettings 設定好
        _supabaseUrl = config["Supabase:Url"] ?? "";
        _bucketName = config["Supabase:BucketName"] ?? "story"; 
    }

    // GET: api/Books
    [HttpGet]
    [Authorize(Policy = "Permission:api.books.get")]
    public async Task<ActionResult<IEnumerable<Book>>> GetBooks()
    {
        // 1. 從資料庫撈取資料，並包含關聯的 Pages
        var books = await _context.Books
            .Include(b => b.Pages.OrderBy(p => p.PageIndex)) // 記得把頁面照順序排好
            .OrderByDescending(b => b.CreatedAt)             // 最新的書在最上面
            .ToListAsync();

        // 2. 加工處理：動態組裝 Supabase 的完整圖片網址
        foreach (var book in books)
        {
            foreach (var page in book.Pages)
            {
                // 如果 ImagePath 有值，且不是完整的 HTTP 網址 (代表是相對路徑)
                if (!string.IsNullOrEmpty(page.ImagePath) && !page.ImagePath.StartsWith("http"))
                {
                    // 格式：{ProjectUrl}/storage/v1/object/public/{BucketName}/{FilePath}
                    // 範例：https://xxx.supabase.co/storage/v1/object/public/story/star_2.jpg
                    page.ImageUrl = $"{_supabaseUrl}/storage/v1/object/public/{_bucketName}/{page.ImagePath}";
                }
                else
                {
                    // 如果本來就是空字串，或者已經是完整網址，就直接用原值
                    page.ImageUrl = page.ImagePath ?? "";
                }
            }
        }

        return Ok(books);
    }
}
