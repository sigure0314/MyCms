using System.Text.Json;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class FramePlaylistService
{
    private readonly string _playlistPath;
    private readonly string _uploadsPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };
    private readonly SemaphoreSlim _mutex = new(1, 1);

    public FramePlaylistService(IWebHostEnvironment environment)
    {
        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        _playlistPath = Path.Combine(webRoot, "frame", "playlist.json");
        _uploadsPath = Path.Combine(webRoot, "frame", "uploads");
    }

    public string UploadsPath => _uploadsPath;

    public async Task<FramePlaylist> LoadAsync()
    {
        await _mutex.WaitAsync();
        try
        {
            EnsureDirectories();
            if (!File.Exists(_playlistPath))
            {
                var playlist = CreateDefaultPlaylist();
                await SaveInternalAsync(playlist);
                return playlist;
            }

            await using var stream = File.OpenRead(_playlistPath);
            var playlistData = await JsonSerializer.DeserializeAsync<FramePlaylist>(stream, _jsonOptions)
                               ?? CreateDefaultPlaylist();

            NormalizePlaylist(playlistData);
            return playlistData;
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task SaveAsync(FramePlaylist playlist)
    {
        await _mutex.WaitAsync();
        try
        {
            EnsureDirectories();
            NormalizePlaylist(playlist);
            await SaveInternalAsync(playlist);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public string GetImagePath(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        return Path.Combine(_uploadsPath, safeName);
    }

    private void EnsureDirectories()
    {
        var playlistDirectory = Path.GetDirectoryName(_playlistPath);
        if (!string.IsNullOrWhiteSpace(playlistDirectory))
        {
            Directory.CreateDirectory(playlistDirectory);
        }

        Directory.CreateDirectory(_uploadsPath);
    }

    private FramePlaylist CreateDefaultPlaylist()
    {
        return new FramePlaylist
        {
            Version = 1,
            IntervalMs = 15000,
            TransitionMs = 1200,
            CacheBustMode = "v",
            StartAtEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            LayoutMode = "3x3",
            Items = new List<FramePlaylistItem>()
        };
    }

    private void NormalizePlaylist(FramePlaylist playlist)
    {
        playlist.CacheBustMode = string.IsNullOrWhiteSpace(playlist.CacheBustMode)
            ? "v"
            : playlist.CacheBustMode;
        playlist.LayoutMode = NormalizeLayoutMode(playlist.LayoutMode);
        playlist.Items = playlist.Items
            .Where(item => !string.IsNullOrWhiteSpace(item.Id))
            .OrderBy(item => item.Order)
            .Select((item, index) =>
            {
                item.Order = index + 1;
                item.Id = string.IsNullOrWhiteSpace(item.Id) ? Guid.NewGuid().ToString("N") : item.Id;
                item.OriginalFileName ??= string.Empty;
                item.FileName ??= string.Empty;
                return item;
            })
            .ToList();
    }

    private static string NormalizeLayoutMode(string? layoutMode)
    {
        return layoutMode?.Trim().ToLowerInvariant() switch
        {
            "1x3" => "1x3",
            "3x3" => "3x3",
            "gallery" => "1x3",
            "mall" => "3x3",
            _ => "3x3"
        };
    }

    private async Task SaveInternalAsync(FramePlaylist playlist)
    {
        await using var stream = File.Create(_playlistPath);
        await JsonSerializer.SerializeAsync(stream, playlist, _jsonOptions);
    }
}
