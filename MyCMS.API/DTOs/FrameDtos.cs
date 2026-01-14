namespace MyCMS.API.DTOs;

public record FramePlaylistAdminResponse(FramePlaylistSettingsResponse Settings, IReadOnlyList<FramePlaylistItemResponse> Items);

public record FramePlaylistSettingsResponse(
    string LayoutMode,
    int IntervalMs,
    int TransitionMs,
    string CacheBustMode,
    long StartAtEpochMs,
    int Version);

public record FramePlaylistItemResponse(
    string Id,
    string FileName,
    string OriginalFileName,
    int Order,
    int Version,
    string ImageUrl);

public record FramePlaylistUpdateRequest(string LayoutMode, IReadOnlyList<FramePlaylistItemOrderRequest> Items);

public record FramePlaylistItemOrderRequest(string Id, int Order);

public record FramePlaylistPlaybackResponse(
    int Version,
    int IntervalMs,
    int TransitionMs,
    string CacheBustMode,
    long StartAtEpochMs,
    string LayoutMode,
    IReadOnlyList<FramePlaylistPlaybackItem> Items);

public record FramePlaylistPlaybackItem(string Url, int Version);
