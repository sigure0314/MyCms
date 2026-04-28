namespace MyCMS.API.Models;

public enum PropertyTaskCategory {
    ElectroMechanical = 1,
    LowVoltage = 2,
    FireSafety = 3,
    Cleaning = 4
}

public class PropertyManagementArea {
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public PropertyTaskCategory Category { get; set; }
    public string QrToken { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<PropertyCheckInLog> CheckInLogs { get; set; } = new();
}
