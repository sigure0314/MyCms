using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InstagramPostsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public InstagramPostsController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InstagramPostDto>>> GetPosts()
    {
        var posts = await _context.InstagramPosts
            .OrderByDescending(post => post.CreatedAt)
            .ToListAsync();

        var result = posts.Select(MapToDto).ToList();
        return Ok(result);
    }

    [HttpGet("{id:int}")]
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

        var uploadFolder = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", "instagram");
        Directory.CreateDirectory(uploadFolder);

        var extension = Path.GetExtension(request.Image.FileName);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadFolder, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await request.Image.CopyToAsync(stream);
        }

        var status = request.Status ?? InstagramPostStatus.PendingReview;
        var post = new InstagramPost
        {
            Caption = request.Caption,
            ImagePath = Path.Combine("uploads", "instagram", fileName).Replace("\\", "/"),
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PublishedAt = status == InstagramPostStatus.Published ? DateTime.UtcNow : null
        };

        _context.InstagramPosts.Add(post);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, MapToDto(post));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<InstagramPostDto>> UpdatePost(int id, [FromBody] UpdateInstagramPostRequest request)
    {
        var post = await _context.InstagramPosts.FindAsync(id);
        if (post == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Caption))
        {
            post.Caption = request.Caption;
        }

        if (request.Status.HasValue)
        {
            post.Status = request.Status.Value;
            if (post.Status == InstagramPostStatus.Published)
            {
                post.PublishedAt ??= DateTime.UtcNow;
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
            PublishedAt = post.PublishedAt
        };
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

        return $"{Request.Scheme}://{Request.Host}/{imagePath.TrimStart('/')}";
    }
}
