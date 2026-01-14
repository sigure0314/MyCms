namespace MyCMS.API.Models;

public class FramePlaylist
{
    public int Version { get; set; } = 1;
    public int IntervalMs { get; set; } = 15000;
    public int TransitionMs { get; set; } = 1200;
    public string CacheBustMode { get; set; } = "v";
    public long StartAtEpochMs { get; set; }
    public string LayoutMode { get; set; } = "3x3";
    public List<FramePlaylistItem> Items { get; set; } = new();
}

public class FramePlaylistItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public int Order { get; set; }
    public int Version { get; set; } = 1;
}
