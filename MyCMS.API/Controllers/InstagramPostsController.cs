using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Options;
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
    private readonly InstagramPublishJobService _instagramPublishJobService;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly InstagramPublishOptions _instagramPublishOptions;
    private readonly Supabase.Client _supabase;
    private readonly string _supabaseUrl;
    private readonly string _bucketName;

    public InstagramPostsController(
        AppDbContext context,
        InstagramPublishJobService instagramPublishJobService,
        IBackgroundJobClient backgroundJobClient,
        Supabase.Client supabase,
        IConfiguration config,
        IOptions<InstagramPublishOptions> instagramPublishOptions)
    {
        _context = context;
        _instagramPublishJobService = instagramPublishJobService;
        _backgroundJobClient = backgroundJobClient;
        _instagramPublishOptions = instagramPublishOptions.Value;
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

        var post = new InstagramPost
        {
            Caption = request.Caption,
            ImagePath = fileName,
            Status = InstagramPostStatus.PendingReview,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ScheduledAt = null
        };

        _context.InstagramPosts.Add(post);
        await _context.SaveChangesAsync();

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
        var shouldSchedulePublishJob = false;

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
                    post.ScheduledAt = GetScheduledAt(request.ScheduledAt);
                    shouldSchedulePublishJob = true;
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

                    var manualPublishResult = await _instagramPublishJobService.PublishPostAsync(post.Id);
                    if (!manualPublishResult)
                    {
                        post.Status = InstagramPostStatus.PendingReview;
                        post.ScheduledAt = null;
                        return StatusCode(StatusCodes.Status502BadGateway, "Instagram 發佈失敗。請稍後再試。");
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
            post.ScheduledAt = GetScheduledAt(request.ScheduledAt);
            shouldSchedulePublishJob = true;
        }

        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (shouldSchedulePublishJob)
        {
            SchedulePublishJob(post.Id, post.ScheduledAt);
        }

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

    private DateTime GetScheduledAt(DateTime? requestScheduledAt)
    {
        if (requestScheduledAt.HasValue)
        {
            return requestScheduledAt.Value.ToUniversalTime();
        }

        return DateTime.UtcNow.AddMinutes(_instagramPublishOptions.DefaultDelayMinutes);
    }

    private void SchedulePublishJob(int postId, DateTime? scheduledAt)
    {
        var enqueueAt = scheduledAt ?? DateTime.UtcNow.AddMinutes(_instagramPublishOptions.DefaultDelayMinutes);
        if (enqueueAt <= DateTime.UtcNow)
        {
            _backgroundJobClient.Enqueue<InstagramPublishJobService>(service => service.PublishPostAsync(postId));
            return;
        }

        _backgroundJobClient.Schedule<InstagramPublishJobService>(
            service => service.PublishPostAsync(postId),
            enqueueAt - DateTime.UtcNow);
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
