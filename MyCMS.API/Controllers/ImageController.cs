using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/image")]
[Authorize]
public sealed class ImageController : ControllerBase
{
    private readonly IImageGenerationService _imageGenerationService;
    private readonly ILogger<ImageController> _logger;

    public ImageController(
        IImageGenerationService imageGenerationService,
        ILogger<ImageController> logger)
    {
        _imageGenerationService = imageGenerationService;
        _logger = logger;
    }

    [HttpPost("generate")]
    [Produces("image/jpeg")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateImageRequest request,
        CancellationToken cancellationToken)
    {
        var prompt = request.Prompt?.Trim();
        if (string.IsNullOrWhiteSpace(prompt))
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Prompt 無效",
                detail: "Prompt 不可為空。");
        }

        try
        {
            var result = await _imageGenerationService.GenerateAsync(prompt, cancellationToken);
            return File(result.ImageBytes, result.ContentType);
        }
        catch (ImageGenerationException exception)
        {
            var statusCode = MapStatusCode(exception.Error);
            _logger.LogWarning(
                "Image generation failed. Error={Error}, UpstreamStatusCode={UpstreamStatusCode}, ResponseStatusCode={ResponseStatusCode}",
                exception.Error, (int?)exception.UpstreamStatusCode, statusCode);
            return Problem(statusCode: statusCode, title: "圖片生成失敗", detail: exception.Message);
        }
    }

    private static int MapStatusCode(ImageGenerationError error) => error switch
    {
        ImageGenerationError.InvalidRequest => StatusCodes.Status400BadRequest,
        ImageGenerationError.RateLimited => StatusCodes.Status429TooManyRequests,
        ImageGenerationError.Configuration => StatusCodes.Status503ServiceUnavailable,
        ImageGenerationError.Timeout => StatusCodes.Status504GatewayTimeout,
        _ => StatusCodes.Status502BadGateway
    };
}
