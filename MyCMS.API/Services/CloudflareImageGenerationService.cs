using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace MyCMS.API.Services;

public sealed class CloudflareImageGenerationService : IImageGenerationService, IImageGenerator
{
    private const string JpegContentType = "image/jpeg";
    private readonly HttpClient _httpClient;
    private readonly CloudflareImageGenerationOptions _options;
    private readonly ILogger<CloudflareImageGenerationService> _logger;

    public CloudflareImageGenerationService(
        HttpClient httpClient,
        IOptions<CloudflareImageGenerationOptions> options,
        ILogger<CloudflareImageGenerationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ImageGenerationResult> GenerateAsync(
        string prompt,
        CancellationToken cancellationToken = default)
    {
        var (token, accountId, model) = GetConfiguration();
        var endpoint = $"accounts/{Uri.EscapeDataString(accountId)}/ai/run/{BuildModelPath(model)}";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            // FLUX 1 Schnell rejects width and height; the provider default is intentional.
            Content = JsonContent.Create(new CloudflareImageRequest(prompt))
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            stopwatch.Stop();

            CloudflareResponse? payload = null;
            try
            {
                payload = await response.Content.ReadFromJsonAsync<CloudflareResponse>(cancellationToken);
            }
            catch (JsonException exception)
            {
                _logger.LogError(exception,
                    "Cloudflare image response was not valid JSON. Model={Model}, StatusCode={StatusCode}, DurationMs={DurationMs}",
                    model, (int)response.StatusCode, stopwatch.ElapsedMilliseconds);
                throw new ImageGenerationException(
                    ImageGenerationError.InvalidResponse,
                    "圖片服務回傳了無效格式。",
                    response.StatusCode,
                    exception);
            }

            if (!response.IsSuccessStatusCode || payload?.Success != true)
            {
                LogCloudflareErrors(payload?.Errors, model, response.StatusCode, stopwatch.ElapsedMilliseconds);
                throw CreateUpstreamException(response.StatusCode);
            }

            if (string.IsNullOrWhiteSpace(payload.Result?.Image))
            {
                _logger.LogError(
                    "Cloudflare image response did not contain result.image. Model={Model}, StatusCode={StatusCode}, DurationMs={DurationMs}",
                    model, (int)response.StatusCode, stopwatch.ElapsedMilliseconds);
                throw new ImageGenerationException(
                    ImageGenerationError.InvalidResponse,
                    "圖片服務未回傳圖片資料。",
                    response.StatusCode);
            }

            byte[] imageBytes;
            try
            {
                imageBytes = Convert.FromBase64String(payload.Result.Image);
            }
            catch (FormatException exception)
            {
                _logger.LogError(exception,
                    "Cloudflare result.image was not valid Base64. Model={Model}, StatusCode={StatusCode}",
                    model, (int)response.StatusCode);
                throw new ImageGenerationException(
                    ImageGenerationError.InvalidResponse,
                    "圖片服務回傳了無效的圖片資料。",
                    response.StatusCode,
                    exception);
            }

            _logger.LogInformation(
                "Cloudflare image generated. Model={Model}, StatusCode={StatusCode}, DurationMs={DurationMs}, ImageBytes={ImageBytes}",
                model, (int)response.StatusCode, stopwatch.ElapsedMilliseconds, imageBytes.Length);
            return new ImageGenerationResult(imageBytes, JpegContentType);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            stopwatch.Stop();
            _logger.LogWarning(exception,
                "Cloudflare image request timed out. Model={Model}, DurationMs={DurationMs}",
                model, stopwatch.ElapsedMilliseconds);
            throw new ImageGenerationException(
                ImageGenerationError.Timeout,
                "圖片生成服務逾時，請稍後再試。",
                innerException: exception);
        }
        catch (HttpRequestException exception)
        {
            stopwatch.Stop();
            _logger.LogError(exception,
                "Cloudflare image request failed. Model={Model}, DurationMs={DurationMs}",
                model, stopwatch.ElapsedMilliseconds);
            throw new ImageGenerationException(
                ImageGenerationError.Upstream,
                "無法連線至圖片生成服務。",
                innerException: exception);
        }
    }

    public async Task<byte[]> GenerateImageAsync(string prompt)
    {
        var result = await GenerateAsync(prompt);
        return result.ImageBytes;
    }

    private (string Token, string AccountId, string Model) GetConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiToken))
        {
            throw MissingConfiguration("CLOUDFLARE_AI_TOKEN");
        }

        if (string.IsNullOrWhiteSpace(_options.AccountId))
        {
            throw MissingConfiguration("CLOUDFLARE_ACCOUNT_ID");
        }

        if (string.IsNullOrWhiteSpace(_options.Model))
        {
            throw MissingConfiguration("CLOUDFLARE_AI_MODEL");
        }

        return (_options.ApiToken, _options.AccountId, _options.Model);
    }

    private ImageGenerationException MissingConfiguration(string settingName)
    {
        _logger.LogError("Cloudflare image generation configuration is missing: {SettingName}", settingName);
        return new ImageGenerationException(
            ImageGenerationError.Configuration,
            "伺服器圖片生成功能尚未設定完成。");
    }

    private static string BuildModelPath(string model) => string.Join(
        '/',
        model.Trim().TrimStart('/').Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Uri.EscapeDataString));

    private void LogCloudflareErrors(
        IReadOnlyList<CloudflareError>? errors,
        string model,
        HttpStatusCode statusCode,
        long durationMs)
    {
        if (errors is null || errors.Count == 0)
        {
            _logger.LogWarning(
                "Cloudflare image request failed. Model={Model}, StatusCode={StatusCode}, DurationMs={DurationMs}",
                model, (int)statusCode, durationMs);
            return;
        }

        foreach (var error in errors)
        {
            _logger.LogWarning(
                "Cloudflare image request failed. Model={Model}, StatusCode={StatusCode}, DurationMs={DurationMs}, CloudflareErrorCode={ErrorCode}, CloudflareErrorMessage={ErrorMessage}",
                model, (int)statusCode, durationMs, error.Code, error.Message);
        }
    }

    private static ImageGenerationException CreateUpstreamException(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.BadRequest => new(ImageGenerationError.InvalidRequest, "圖片生成服務拒絕了請求。", statusCode),
        HttpStatusCode.Unauthorized => new(ImageGenerationError.Unauthorized, "圖片生成服務驗證失敗。", statusCode),
        HttpStatusCode.Forbidden => new(ImageGenerationError.Forbidden, "圖片生成服務拒絕存取。", statusCode),
        HttpStatusCode.TooManyRequests => new(ImageGenerationError.RateLimited, "圖片生成服務流量已達上限，請稍後再試。", statusCode),
        _ => new(ImageGenerationError.Upstream, "圖片生成服務目前無法完成請求。", statusCode)
    };

    private sealed record CloudflareImageRequest([property: JsonPropertyName("prompt")] string Prompt);

    private sealed class CloudflareResponse
    {
        [JsonPropertyName("result")]
        public CloudflareResult? Result { get; init; }

        [JsonPropertyName("success")]
        public bool Success { get; init; }

        [JsonPropertyName("errors")]
        public List<CloudflareError>? Errors { get; init; }
    }

    private sealed class CloudflareResult
    {
        [JsonPropertyName("image")]
        public string? Image { get; init; }
    }

    private sealed class CloudflareError
    {
        [JsonPropertyName("code")]
        public int? Code { get; init; }

        [JsonPropertyName("message")]
        public string? Message { get; init; }
    }
}
