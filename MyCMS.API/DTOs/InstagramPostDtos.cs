using Microsoft.AspNetCore.Http;
using MyCMS.API.Models;

namespace MyCMS.API.DTOs;

public class InstagramPostDto
{
    public int Id { get; set; }
    public string Caption { get; set; } = string.Empty;
    public InstagramPostStatus Status { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class CreateInstagramPostRequest
{
    public string Caption { get; set; } = string.Empty;
    public InstagramPostStatus? Status { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public IFormFile? Image { get; set; }
}

public class UpdateInstagramPostRequest
{
    public string? Caption { get; set; }
    public InstagramPostStatus? Status { get; set; }
    public DateTime? ScheduledAt { get; set; }
}
