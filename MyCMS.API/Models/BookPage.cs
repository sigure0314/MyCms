using System.ComponentModel.DataAnnotations.Schema; // ✨ 關鍵就是這一行
using System.Text.Json.Serialization;

namespace MyCMS.API.Models;

public class BookPage
{
    public int Id { get; set; }
    
    // 關聯設定
    public int BookId { get; set; }
    [JsonIgnore]
    public Book? Book { get; set; }

    public int PageIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public string ImagePrompt { get; set; } = string.Empty;

    // ✅ 資料庫真正存的路徑 (例如: "star_1.jpg")
    public string ImagePath { get; set; } = string.Empty; 

    // ✅ 這是給前端用的網址，不存進資料庫，所以要加 [NotMapped]
    [NotMapped]
    public string ImageUrl { get; set; } = string.Empty;
}