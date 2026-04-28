namespace MyCMS.API.Models;

public class PropertyCheckInLog {
    public int Id { get; set; }
    public int AreaId { get; set; }
    public PropertyManagementArea Area { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CheckInAtUtc { get; set; } = DateTime.UtcNow;
    public string? Note { get; set; }
}
