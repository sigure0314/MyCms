namespace MyCMS.API.DTOs;

public class FetchYoutubeCommentsRequest
{
    public string VideoInput { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

public class YoutubeCommentDto
{
    public string Id { get; set; } = string.Empty;
    public string VideoId { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public long LikeCount { get; set; }
    public DateTime PublishedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FetchYoutubeCommentsResponse
{
    public string TempFileId { get; set; } = string.Empty;
    public int PageCount { get; set; }
    public int TotalCount { get; set; }
    public List<YoutubeCommentDto> Comments { get; set; } = [];
}

public class ExportYoutubeCommentsRequest
{
    public string TempFileId { get; set; } = string.Empty;
}
