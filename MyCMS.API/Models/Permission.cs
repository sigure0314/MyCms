namespace MyCMS.API.Models;

public class Permission {
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public Permission? Parent { get; set; }
    public List<Permission> Children { get; set; } = new();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public byte Type { get; set; }
    public string? RoutePath { get; set; }
    public string? ApiMethod { get; set; }
    public string? ApiPath { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<RolePermission> RolePermissions { get; set; } = new();
}
