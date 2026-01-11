namespace MyCMS.API.Models;

public enum UserStatus
{
    Pending = 0,
    Approved = 1
}

public class User {
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty; // 存 Hash，不存明文
    public string Email { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public UserStatus Status { get; set; } = UserStatus.Pending;
}
