using Microsoft.EntityFrameworkCore;
using MyCMS.API.Models;

namespace MyCMS.API.Data;

public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    
    public DbSet<Book> Books { get; set; }
    // ✨ 新增這行
    public DbSet<BookPage> BookPages { get; set; }
    public DbSet<InstagramPost> InstagramPosts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        // 預設建立兩個角色
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin" }, 
            new Role { Id = 2, Name = "Editor" }
        );
    }
}
