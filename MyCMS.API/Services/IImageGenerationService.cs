using System.Net;

namespace MyCMS.API.Services;

public interface IImageGenerationService
{
    Task<ImageGenerationResult> GenerateAsync(
        string prompt,
        CancellationToken cancellationToken = default);
}

public sealed record ImageGenerationResult(byte[] ImageBytes, string ContentType);

public enum ImageGenerationError
{
    Configuration,
    InvalidRequest,
    Unauthorized,
    Forbidden,
    RateLimited,
    Upstream,
    InvalidResponse,
    Timeout
}

public sealed class ImageGenerationException : Exception
{
    public ImageGenerationException(
        ImageGenerationError error,
        string message,
        HttpStatusCode? upstreamStatusCode = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        Error = error;
        UpstreamStatusCode = upstreamStatusCode;
    }

    public ImageGenerationError Error { get; }
    public HttpStatusCode? UpstreamStatusCode { get; }
}
