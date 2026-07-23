using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class InstagramPublishJobService
{
    private readonly AppDbContext _context;
    private readonly InstagramGraphApiService _instagramGraphApiService;
    private readonly string _supabaseUrl;
    private readonly string _bucketName;

    public InstagramPublishJobService(
        AppDbContext context,
        InstagramGraphApiService instagramGraphApiService,
        IConfiguration config)
    {
        _context = context;
        _instagramGraphApiService = instagramGraphApiService;
        _supabaseUrl = config["Supabase:Url"] ?? string.Empty;
        _bucketName = config["Supabase:InstagramBucketName"] ?? "instagram";
    }

    public async Task<bool> PublishPostAsync(int postId)
    {
        var post = await _context.InstagramPosts.FirstOrDefaultAsync(item => item.Id == postId);
        if (post == null || post.Status == InstagramPostStatus.Published)
        {
            return true;
        }

        if (post.Status != InstagramPostStatus.Approved)
        {
            return false;
        }

        var imageUrl = BuildImageUrl(post.ImagePath);
        var publishResult = await _instagramGraphApiService.PublishAsync(imageUrl, post.Caption, CancellationToken.None);
        if (!publishResult.Success)
        {
            return false;
        }

        post.Status = InstagramPostStatus.Published;
        post.PublishedAt ??= DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;
        post.ScheduledAt = null;
        await _context.SaveChangesAsync();
        return true;
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
