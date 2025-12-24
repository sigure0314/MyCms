namespace MyCMS.API.Models;

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty; // 書名
    public int ViewCount { get; set; } // 點閱次數
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // 建立 1 對多關聯：一本書有很多頁
    public List<BookPage> Pages { get; set; } = new();
}