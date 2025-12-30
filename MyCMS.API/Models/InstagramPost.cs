using System.Text.Json.Serialization;

namespace MyCMS.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstagramPostStatus
{
    PendingReview = 0,
    Published = 1
}

public class InstagramPost
{
    public int Id { get; set; }
    public string Caption { get; set; } = string.Empty;
    public string ImagePath { get; set; } = string.Empty;
    public InstagramPostStatus Status { get; set; } = InstagramPostStatus.PendingReview;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}
