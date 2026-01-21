namespace MyCMS.API.DTOs;

public record OnlineUserHeartbeatRequest(string CurrentPage);

public class OnlineUserDto
{
    public string Username { get; set; } = string.Empty;
    public double TotalSeconds { get; set; }
    public string CurrentPage { get; set; } = string.Empty;
    public string LoginIp { get; set; } = string.Empty;
    public DateTimeOffset LoginAtUtc { get; set; }
    public DateTimeOffset LastSeenUtc { get; set; }
}
