using System.Text.Json;
using Microsoft.Extensions.Options;

namespace MyCMS.API.Services;

public class InstagramGraphApiOptions
{
    public string AccessToken { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://graph.facebook.com/v19.0";
}

public record InstagramPublishResult(bool Success, string? ErrorMessage, string? CreationId, string? MediaId);

public class InstagramGraphApiService
{
    private readonly HttpClient _httpClient;
    private readonly InstagramGraphApiOptions _options;
    private readonly ILogger<InstagramGraphApiService> _logger;

    public InstagramGraphApiService(
        HttpClient httpClient,
        IOptions<InstagramGraphApiOptions> options,
        ILogger<InstagramGraphApiService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<InstagramPublishResult> PublishAsync(string imageUrl, string caption, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.AccessToken) || string.IsNullOrWhiteSpace(_options.UserId))
        {
            return new InstagramPublishResult(false, "Instagram Graph API 設定未完成。", null, null);
        }

        var creationId = await CreateMediaContainerAsync(imageUrl, caption, cancellationToken);
        if (string.IsNullOrWhiteSpace(creationId))
        {
            return new InstagramPublishResult(false, "建立媒體容器失敗。", null, null);
        }

        var mediaId = await PublishMediaContainerAsync(creationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(mediaId))
        {
            return new InstagramPublishResult(false, "發布媒體內容失敗。", creationId, null);
        }

        return new InstagramPublishResult(true, null, creationId, mediaId);
    }

    private async Task<string?> CreateMediaContainerAsync(string imageUrl, string caption, CancellationToken cancellationToken)
    {
        var requestUrl = $"{_options.ApiBaseUrl.TrimEnd('/')}/{_options.UserId}/media";
        var payload = new Dictionary<string, string>
        {
            ["image_url"] = imageUrl,
            ["caption"] = caption ?? string.Empty,
            ["access_token"] = _options.AccessToken
        };

        var response = await _httpClient.PostAsync(requestUrl, new FormUrlEncodedContent(payload), cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Instagram media container creation failed: {StatusCode} {Body}", response.StatusCode, content);
            return null;
        }

        return TryReadId(content);
    }

    private async Task<string?> PublishMediaContainerAsync(string creationId, CancellationToken cancellationToken)
    {
        var requestUrl = $"{_options.ApiBaseUrl.TrimEnd('/')}/{_options.UserId}/media_publish";
        var payload = new Dictionary<string, string>
        {
            ["creation_id"] = creationId,
            ["access_token"] = _options.AccessToken
        };

        var response = await _httpClient.PostAsync(requestUrl, new FormUrlEncodedContent(payload), cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Instagram media publish failed: {StatusCode} {Body}", response.StatusCode, content);
            return null;
        }

        return TryReadId(content);
    }

    private static string? TryReadId(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("id", out var idElement))
            {
                return idElement.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }
}
