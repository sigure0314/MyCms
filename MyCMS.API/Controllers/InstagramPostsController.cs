using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InstagramPostsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly InstagramGraphApiService _instagramGraphApiService;
    private readonly Supabase.Client _supabase;
    private readonly string _supabaseUrl;
    private readonly string _bucketName;

    public InstagramPostsController(
        AppDbContext context,
        InstagramGraphApiService instagramGraphApiService,
        Supabase.Client supabase,
        IConfiguration config)
    {
        _context = context;
        _instagramGraphApiService = instagramGraphApiService;
        _supabase = supabase;
        _supabaseUrl = config["Supabase:Url"] ?? string.Empty;
        _bucketName = config["Supabase:InstagramBucketName"] ?? "instagram";
    }

    [HttpGet]
    [Authorize(Policy = "Permission:api.instagram.get")]
    public async Task<ActionResult<IEnumerable<InstagramPostDto>>> GetPosts()
    {
        var posts = await _context.InstagramPosts
            .OrderByDescending(post => post.CreatedAt)
            .ToListAsync();

        var result = posts.Select(MapToDto).ToList();
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Permission:api.instagram.get-one")]
    public async Task<ActionResult<InstagramPostDto>> GetPost(int id)
    {
        var post = await _context.InstagramPosts.FindAsync(id);
        if (post == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(post));
    }

    [HttpPost]
    [Authorize(Policy = "Permission:api.instagram.create")]
    public async Task<ActionResult<InstagramPostDto>> CreatePost([FromForm] CreateInstagramPostRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Caption))
        {
            return BadRequest("請輸入貼文內容。");
        }

        if (request.Image == null || request.Image.Length == 0)
        {
            return BadRequest("請上傳貼文圖片。");
        }

        var extension = Path.GetExtension(request.Image.FileName);
        var fileName = $"instagram/{Guid.NewGuid():N}{extension}";

        await using var memoryStream = new MemoryStream();
        await request.Image.CopyToAsync(memoryStream);
        var imageBytes = memoryStream.ToArray();

        await _supabase.Storage
            .From(_bucketName)
            .Upload(imageBytes, fileName, new Supabase.Storage.FileOptions { Upsert = true });

        var requestedStatus = request.Status ?? InstagramPostStatus.PendingReview;
        if (requestedStatus == InstagramPostStatus.Published)
        {
            requestedStatus = InstagramPostStatus.Approved;
        }
        var scheduledAt = request.ScheduledAt?.ToUniversalTime();
        if (requestedStatus != InstagramPostStatus.Approved && requestedStatus != InstagramPostStatus.Published)
        {
            scheduledAt = null;
        }

        var post = new InstagramPost
        {
            Caption = request.Caption,
            ImagePath = fileName,
            Status = requestedStatus,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ScheduledAt = scheduledAt
        };

        _context.InstagramPosts.Add(post);
        await _context.SaveChangesAsync();

        if (post.Status == InstagramPostStatus.Approved && IsReadyToPublish(post.ScheduledAt))
        {
            var publishResult = await TryPublishAsync(post);
            if (!publishResult.Success)
            {
                post.Status = InstagramPostStatus.PendingReview;
                post.ScheduledAt = null;
                post.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return StatusCode(StatusCodes.Status502BadGateway, publishResult.ErrorMessage);
            }
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, MapToDto(post));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Permission:api.instagram.update")]
    public async Task<ActionResult<InstagramPostDto>> UpdatePost(int id, [FromBody] UpdateInstagramPostRequest request)
    {
        var post = await _context.InstagramPosts.FindAsync(id);
        if (post == null)
        {
            return NotFound();
        }

        var previousStatus = post.Status;

        if (!string.IsNullOrWhiteSpace(request.Caption))
        {
            post.Caption = request.Caption;
        }

        if (request.Status.HasValue)
        {
            switch (request.Status.Value)
            {
                case InstagramPostStatus.Rejected:
                    if (previousStatus == InstagramPostStatus.Published)
                    {
                        return BadRequest("已發佈的貼文無法改為審核拒絕。");
                    }

                    post.Status = InstagramPostStatus.Rejected;
                    post.ScheduledAt = null;
                    break;
                case InstagramPostStatus.Approved:
                    post.Status = InstagramPostStatus.Approved;
                    post.ScheduledAt = request.ScheduledAt?.ToUniversalTime();
                    if (IsReadyToPublish(post.ScheduledAt))
                    {
                        var publishResult = await TryPublishAsync(post);
                        if (!publishResult.Success)
                        {
                            post.Status = InstagramPostStatus.PendingReview;
                            post.ScheduledAt = null;
                            return StatusCode(StatusCodes.Status502BadGateway, publishResult.ErrorMessage);
                        }
                    }
                    break;
                case InstagramPostStatus.Published:
                    if (previousStatus == InstagramPostStatus.Published)
                    {
                        break;
                    }

                    if (previousStatus != InstagramPostStatus.Approved)
                    {
                        return BadRequest("請先審核通過後再發佈。");
                    }

                    var manualPublishResult = await TryPublishAsync(post);
                    if (!manualPublishResult.Success)
                    {
                        post.Status = InstagramPostStatus.PendingReview;
                        post.ScheduledAt = null;
                        return StatusCode(StatusCodes.Status502BadGateway, manualPublishResult.ErrorMessage);
                    }
                    break;
                default:
                    post.Status = InstagramPostStatus.PendingReview;
                    post.ScheduledAt = null;
                    break;
            }
        }
        else if (request.ScheduledAt.HasValue && post.Status == InstagramPostStatus.Approved)
        {
            post.ScheduledAt = request.ScheduledAt?.ToUniversalTime();
            if (IsReadyToPublish(post.ScheduledAt))
            {
                var publishResult = await TryPublishAsync(post);
                if (!publishResult.Success)
                {
                    post.Status = InstagramPostStatus.PendingReview;
                    post.ScheduledAt = null;
                    return StatusCode(StatusCodes.Status502BadGateway, publishResult.ErrorMessage);
                }
            }
        }

        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(post));
    }

    private InstagramPostDto MapToDto(InstagramPost post)
    {
        return new InstagramPostDto
        {
            Id = post.Id,
            Caption = post.Caption,
            Status = post.Status,
            ImageUrl = BuildImageUrl(post.ImagePath),
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            ScheduledAt = post.ScheduledAt,
            PublishedAt = post.PublishedAt
        };
    }

    private bool IsReadyToPublish(DateTime? scheduledAt)
    {
        return !scheduledAt.HasValue || scheduledAt.Value <= DateTime.UtcNow;
    }

    private async Task<(bool Success, string? ErrorMessage)> TryPublishAsync(InstagramPost post)
    {
        var imageUrl = BuildImageUrl(post.ImagePath);
        var publishResult = await _instagramGraphApiService.PublishAsync(imageUrl, post.Caption, HttpContext.RequestAborted);
        if (!publishResult.Success)
        {
            return (false, publishResult.ErrorMessage);
        }

        post.Status = InstagramPostStatus.Published;
        post.PublishedAt ??= DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;
        post.ScheduledAt = null;
        await _context.SaveChangesAsync();
        return (true, null);
    }

    private string BuildImageUrl(string? imagePath)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return string.Empty;
        }

        if (imagePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return imagePath;
        }

        return $"{_supabaseUrl}/storage/v1/object/public/{_bucketName}/{imagePath.TrimStart('/')}";
    }
}
