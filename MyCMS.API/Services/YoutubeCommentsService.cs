using System.Globalization;
using System.Text;
using System.Text.Json;
using MyCMS.API.DTOs;

namespace MyCMS.API.Services;

public class YoutubeCommentsService
{
    private const string YoutubeApiBase = "https://www.googleapis.com/youtube/v3/commentThreads";
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public YoutubeCommentsService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["YouTube:ApiKey"] ?? string.Empty;
    }

    public async Task<FetchYoutubeCommentsResponse> FetchCommentsAsync(string videoInput, CancellationToken cancellationToken)
    {
        var videoId = ExtractVideoId(videoInput);
        if (videoId == null)
        {
            throw new ArgumentException("請輸入有效的 YouTube 影片網址或影片 ID。");
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new ArgumentException("伺服器尚未設定 YouTube API Key，請先更新後端設定檔。");
        }

        var comments = new List<YoutubeCommentDto>();
        string? nextPageToken = null;
        var pageCount = 0;

        do
        {
            pageCount += 1;

            var query = new Dictionary<string, string>
            {
                ["part"] = "snippet",
                ["videoId"] = videoId,
                ["maxResults"] = "100",
                ["key"] = _apiKey.Trim()
            };

            if (!string.IsNullOrWhiteSpace(nextPageToken))
            {
                query["pageToken"] = nextPageToken;
            }

            var uriBuilder = new UriBuilder(YoutubeApiBase)
            {
                Query = string.Join("&", query.Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value)}"))
            };

            using var response = await _httpClient.GetAsync(uriBuilder.Uri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new InvalidOperationException($"YouTube API 錯誤 ({(int)response.StatusCode}): {errorContent}");
            }

            var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<YoutubeCommentThreadResponse>(stream, _jsonOptions, cancellationToken);
            if (payload?.Items == null)
            {
                break;
            }

            foreach (var item in payload.Items)
            {
                var top = item.Snippet.TopLevelComment;
                var snippet = top.Snippet;

                comments.Add(new YoutubeCommentDto
                {
                    Id = top.Id,
                    VideoId = snippet.VideoId,
                    Author = snippet.AuthorDisplayName,
                    Content = snippet.TextDisplay,
                    LikeCount = snippet.LikeCount,
                    PublishedAt = ParseDateTime(snippet.PublishedAt),
                    UpdatedAt = ParseDateTime(snippet.UpdatedAt)
                });
            }

            nextPageToken = payload.NextPageToken;
        } while (!string.IsNullOrWhiteSpace(nextPageToken));

        var tempFileId = Guid.NewGuid().ToString("N");
        var tempJsonPath = BuildTempPath(tempFileId, "json");
        Directory.CreateDirectory(Path.GetDirectoryName(tempJsonPath)!);

        await using (var fs = File.Create(tempJsonPath))
        {
            await JsonSerializer.SerializeAsync(fs, comments, _jsonOptions, cancellationToken);
        }

        return new FetchYoutubeCommentsResponse
        {
            TempFileId = tempFileId,
            PageCount = pageCount,
            TotalCount = comments.Count,
            Comments = comments
        };
    }

    public async Task<string> ExportCsvAsync(string tempFileId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tempFileId))
        {
            throw new ArgumentException("TempFileId 不可為空。", nameof(tempFileId));
        }

        var jsonPath = BuildTempPath(tempFileId, "json");
        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException("找不到暫存留言資料，請重新讀取留言。", jsonPath);
        }

        await using var source = File.OpenRead(jsonPath);
        var comments = await JsonSerializer.DeserializeAsync<List<YoutubeCommentDto>>(source, _jsonOptions, cancellationToken) ?? [];

        var csvFileId = Guid.NewGuid().ToString("N");
        var csvPath = BuildTempPath(csvFileId, "csv");
        Directory.CreateDirectory(Path.GetDirectoryName(csvPath)!);

        var sb = new StringBuilder();
        sb.AppendLine("Id,VideoId,Author,Content,LikeCount,PublishedAt,UpdatedAt");
        foreach (var c in comments)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                EscapeCsv(c.Id),
                EscapeCsv(c.VideoId),
                EscapeCsv(c.Author),
                EscapeCsv(c.Content),
                c.LikeCount.ToString(CultureInfo.InvariantCulture),
                EscapeCsv(c.PublishedAt.ToString("O", CultureInfo.InvariantCulture)),
                EscapeCsv(c.UpdatedAt.ToString("O", CultureInfo.InvariantCulture))
            }));
        }

        await File.WriteAllTextAsync(csvPath, sb.ToString(), Encoding.UTF8, cancellationToken);
        return csvFileId;
    }

    public (string Path, string DownloadFileName) ResolveCsvFile(string fileId)
    {
        var path = BuildTempPath(fileId, "csv");
        return (path, $"youtube-comments-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    private static string EscapeCsv(string input)
    {
        var normalized = input.Replace("\r", " ").Replace("\n", " ").Replace("\"", "\"\"");
        return $"\"{normalized}\"";
    }

    private static string BuildTempPath(string fileId, string extension)
    {
        return Path.Combine(Path.GetTempPath(), "MyCmsYoutubeComments", $"{fileId}.{extension}");
    }

    private static DateTime ParseDateTime(string value)
    {
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed)
            ? parsed
            : DateTime.UtcNow;
    }

    private static string? ExtractVideoId(string input)
    {
        var raw = input.Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(raw, "^[a-zA-Z0-9_-]{11}$"))
        {
            return raw;
        }

        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.Host.Contains("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            var first = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return IsValidVideoId(first) ? first : null;
        }

        if (!uri.Host.Contains("youtube.com", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        if (query.TryGetValue("v", out var v) && IsValidVideoId(v.ToString()))
        {
            return v.ToString();
        }

        var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var shortsIdx = Array.FindIndex(parts, p => p.Equals("shorts", StringComparison.OrdinalIgnoreCase));
        if (shortsIdx >= 0 && shortsIdx + 1 < parts.Length && IsValidVideoId(parts[shortsIdx + 1]))
        {
            return parts[shortsIdx + 1];
        }

        var embedIdx = Array.FindIndex(parts, p => p.Equals("embed", StringComparison.OrdinalIgnoreCase));
        if (embedIdx >= 0 && embedIdx + 1 < parts.Length && IsValidVideoId(parts[embedIdx + 1]))
        {
            return parts[embedIdx + 1];
        }

        return null;
    }

    private static bool IsValidVideoId(string? value)
    {
        return !string.IsNullOrWhiteSpace(value) &&
               System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-zA-Z0-9_-]{11}$");
    }

    private sealed class YoutubeCommentThreadResponse
    {
        public string? NextPageToken { get; set; }
        public List<YoutubeCommentItem> Items { get; set; } = [];
    }

    private sealed class YoutubeCommentItem
    {
        public YoutubeCommentItemSnippet Snippet { get; set; } = new();
    }

    private sealed class YoutubeCommentItemSnippet
    {
        public YoutubeTopLevelComment TopLevelComment { get; set; } = new();
    }

    private sealed class YoutubeTopLevelComment
    {
        public string Id { get; set; } = string.Empty;
        public YoutubeTopLevelCommentSnippet Snippet { get; set; } = new();
    }

    private sealed class YoutubeTopLevelCommentSnippet
    {
        public string AuthorDisplayName { get; set; } = string.Empty;
        public string TextDisplay { get; set; } = string.Empty;
        public long LikeCount { get; set; }
        public string PublishedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
        public string VideoId { get; set; } = string.Empty;
    }
}
