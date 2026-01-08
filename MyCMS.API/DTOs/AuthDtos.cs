namespace MyCMS.API.DTOs;

public record RegisterRequest(string Username, string Password, string Email);
public record LoginRequest(string Username, string Password);

public class AuthResponse {
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
