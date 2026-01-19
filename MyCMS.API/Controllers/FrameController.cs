using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Models;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/frame")]
public class FrameController : ControllerBase
{
    private readonly FramePlaylistService _playlistService;
    private readonly Supabase.Client _supabase;
    private readonly string _supabaseUrl;
    private readonly string _bucketName;

    public FrameController(FramePlaylistService playlistService, Supabase.Client supabase, IConfiguration config)
    {
        _playlistService = playlistService;
        _supabase = supabase;
        _supabaseUrl = config["Supabase:Url"] ?? string.Empty;
        _bucketName = config["Supabase:FrameBucketName"] ?? "frame";
    }

    [HttpGet("playlist")]
    [AllowAnonymous]
    public async Task<ActionResult<FramePlaylistPlaybackResponse>> GetPlaylist()
    {
        var playlist = await _playlistService.LoadAsync();
        playlist = await EnsurePlaylistFromStorageAsync(playlist);
        var response = BuildPlaybackResponse(playlist);
        return Ok(response);
    }

    [HttpGet("admin")]
    [Authorize(Policy = "Permission:api.frame.get")]
    public async Task<ActionResult<FramePlaylistAdminResponse>> GetAdminPlaylist()
    {
        var playlist = await _playlistService.LoadAsync();
        playlist = await EnsurePlaylistFromStorageAsync(playlist);
        var response = BuildAdminResponse(playlist);
        return Ok(response);
    }

    [HttpGet("storage-images")]
    [Authorize(Policy = "Permission:api.frame.get")]
    public async Task<ActionResult<IReadOnlyList<FrameStorageImageResponse>>> GetStorageImages()
    {
        var storageFolder = "frame";
        var items = await _supabase.Storage.From(_bucketName).List(storageFolder);
        var images = items
            .Where(item => !string.IsNullOrWhiteSpace(item.Name))
            .Select(item =>
            {
                var path = $"{storageFolder}/{item.Name}";
                return new FrameStorageImageResponse(path, BuildImageUrl(path));
            })
            .ToList();

        return Ok(images);
    }

    [HttpPost("images")]
    [Authorize(Policy = "Permission:api.frame.update")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<FramePlaylistAdminResponse>> UploadImage([FromForm] FramePlaylistImageUploadRequest request)
    {
        var image = request.Image;
        if (image == null || image.Length == 0)
        {
            return BadRequest("Image file is required.");
        }

        var extension = Path.GetExtension(image.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".jpg";
        }

        var fileName = $"frame_{Guid.NewGuid():N}{extension}";
        var storagePath = $"frame/{fileName}";

        await using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream);
        var imageBytes = memoryStream.ToArray();

        await _supabase.Storage
            .From(_bucketName)
            .Upload(imageBytes, storagePath, new Supabase.Storage.FileOptions { Upsert = true });

        var playlist = await _playlistService.LoadAsync();
        var nextOrder = playlist.Items.Count == 0 ? 1 : playlist.Items.Max(item => item.Order) + 1;
        playlist.Items.Add(new FramePlaylistItem
        {
            FileName = storagePath,
            OriginalFileName = image.FileName,
            Order = nextOrder,
            Version = 1
        });
        playlist.Version += 1;
        playlist.StartAtEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await _playlistService.SaveAsync(playlist);
        return Ok(BuildAdminResponse(playlist));
    }

    [HttpPut("playlist")]
    [Authorize(Policy = "Permission:api.frame.update")]
    public async Task<ActionResult<FramePlaylistAdminResponse>> UpdatePlaylist([FromBody] FramePlaylistUpdateRequest request)
    {
        var playlist = await _playlistService.LoadAsync();
        playlist.LayoutMode = request.LayoutMode;

        if (request.Items != null && request.Items.Count > 0)
        {
            var orderLookup = request.Items
                .GroupBy(item => item.Id)
                .ToDictionary(group => group.Key, group => group.First().Order);

            foreach (var item in playlist.Items)
            {
                if (orderLookup.TryGetValue(item.Id, out var order))
                {
                    item.Order = order;
                }
            }
        }

        playlist.Version += 1;
        playlist.StartAtEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await _playlistService.SaveAsync(playlist);
        return Ok(BuildAdminResponse(playlist));
    }

    [HttpDelete("items/{id}")]
    [Authorize(Policy = "Permission:api.frame.update")]
    public async Task<ActionResult<FramePlaylistAdminResponse>> DeleteItem(string id)
    {
        var playlist = await _playlistService.LoadAsync();
        var target = playlist.Items.FirstOrDefault(item => item.Id == id);
        if (target == null)
        {
            return NotFound();
        }

        playlist.Items.Remove(target);
        if (!string.IsNullOrWhiteSpace(target.FileName) &&
            !target.FileName.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            if (IsLocalUploadPath(target.FileName))
            {
                var filePath = _playlistService.GetImagePath(target.FileName);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
            else if (target.FileName.Contains('/'))
            {
                await _supabase.Storage
                    .From(_bucketName)
                    .Remove(new List<string> { target.FileName.TrimStart('/') });
            }
            else
            {
                var filePath = _playlistService.GetImagePath(target.FileName);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
        }

        playlist.Version += 1;
        playlist.StartAtEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await _playlistService.SaveAsync(playlist);
        return Ok(BuildAdminResponse(playlist));
    }

    [HttpGet("images/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetImage(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        var filePath = _playlistService.GetImagePath(safeName);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }

        var contentType = "application/octet-stream";
        return PhysicalFile(filePath, contentType);
    }

    private FramePlaylistAdminResponse BuildAdminResponse(FramePlaylist playlist)
    {
        var items = playlist.Items
            .OrderBy(item => item.Order)
            .Select(item => new FramePlaylistItemResponse(
                item.Id,
                item.FileName,
                item.OriginalFileName,
                item.Order,
                item.Version,
                BuildImageUrl(item.FileName)))
            .ToList();

        var settings = new FramePlaylistSettingsResponse(
            playlist.LayoutMode,
            playlist.IntervalMs,
            playlist.TransitionMs,
            playlist.CacheBustMode,
            playlist.StartAtEpochMs,
            playlist.Version);

        return new FramePlaylistAdminResponse(settings, items);
    }

    private FramePlaylistPlaybackResponse BuildPlaybackResponse(FramePlaylist playlist)
    {
        var items = playlist.Items
            .OrderBy(item => item.Order)
            .Select(item => new FramePlaylistPlaybackItem(BuildImageUrl(item.FileName), item.Version))
            .ToList();

        return new FramePlaylistPlaybackResponse(
            playlist.Version,
            playlist.IntervalMs,
            playlist.TransitionMs,
            playlist.CacheBustMode,
            playlist.StartAtEpochMs,
            playlist.LayoutMode,
            items);
    }

    private async Task<FramePlaylist> EnsurePlaylistFromStorageAsync(FramePlaylist playlist)
    {
        if (playlist.Items.Count > 0)
        {
            return playlist;
        }

        var storageFolder = "frame";
        var items = await _supabase.Storage.From(_bucketName).List(storageFolder);
        var storageItems = items
            .Where(item => !string.IsNullOrWhiteSpace(item.Name))
            .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .Select((item, index) => new FramePlaylistItem
            {
                Id = Guid.NewGuid().ToString("N"),
                FileName = $"{storageFolder}/{item.Name}",
                OriginalFileName = item.Name,
                Order = index + 1,
                Version = 1
            })
            .ToList();

        if (storageItems.Count == 0)
        {
            return playlist;
        }

        playlist.Items = storageItems;
        playlist.Version += 1;
        playlist.StartAtEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await _playlistService.SaveAsync(playlist);
        return playlist;
    }

    private string BuildImageUrl(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return string.Empty;
        }

        if (fileName.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return fileName;
        }

        if (IsLocalUploadPath(fileName))
        {
            var safeName = Path.GetFileName(fileName);
            return $"/frame/uploads/{safeName}";
        }

        if (!fileName.Contains('/'))
        {
            var safeName = Path.GetFileName(fileName);
            return Url.Action(nameof(GetImage), new { fileName = safeName }) ?? $"/api/frame/images/{safeName}";
        }

        var safePath = fileName.TrimStart('/');
        return $"{_supabaseUrl}/storage/v1/object/public/{_bucketName}/{safePath}";
    }

    private static bool IsLocalUploadPath(string fileName)
    {
        return fileName.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase)
               || fileName.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
               || fileName.StartsWith("frame/uploads/", StringComparison.OrdinalIgnoreCase)
               || fileName.StartsWith("/frame/uploads/", StringComparison.OrdinalIgnoreCase);
    }
}
