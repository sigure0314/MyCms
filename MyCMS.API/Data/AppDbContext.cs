using Microsoft.EntityFrameworkCore;
using MyCMS.API.Models;

namespace MyCMS.API.Data;

public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    
    public DbSet<Book> Books { get; set; }
    // ✨ 新增這行
    public DbSet<BookPage> BookPages { get; set; }
    public DbSet<InstagramPost> InstagramPosts { get; set; }
    public DbSet<PropertyManagementArea> PropertyManagementAreas { get; set; }
    public DbSet<PropertyCheckInLog> PropertyCheckInLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId);

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId);

        modelBuilder.Entity<Permission>()
            .HasOne(p => p.Parent)
            .WithMany(p => p.Children)
            .HasForeignKey(p => p.ParentId);


        modelBuilder.Entity<PropertyManagementArea>()
            .HasIndex(a => a.QrToken)
            .IsUnique();

        modelBuilder.Entity<PropertyCheckInLog>()
            .HasOne(l => l.Area)
            .WithMany(a => a.CheckInLogs)
            .HasForeignKey(l => l.AreaId);

        modelBuilder.Entity<PropertyCheckInLog>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId);

        // 預設建立兩個角色
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin" },
            new Role { Id = 2, Name = "Editor" },
            new Role { Id = 3, Name = "機電人員" },
            new Role { Id = 4, Name = "清潔人員" }
        );
    }
}
