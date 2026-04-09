using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/youtube-comments")]
[Authorize]
public class YoutubeCommentsController : ControllerBase
{
    private readonly YoutubeCommentsService _youtubeCommentsService;

    public YoutubeCommentsController(YoutubeCommentsService youtubeCommentsService)
    {
        _youtubeCommentsService = youtubeCommentsService;
    }

    [HttpPost("fetch")]
    public async Task<ActionResult<FetchYoutubeCommentsResponse>> FetchComments([FromBody] FetchYoutubeCommentsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _youtubeCommentsService.FetchCommentsAsync(request.VideoInput, request.ApiKey, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, ex.Message);
        }
    }

    [HttpPost("export")]
    public async Task<ActionResult<object>> ExportComments([FromBody] ExportYoutubeCommentsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var fileId = await _youtubeCommentsService.ExportCsvAsync(request.TempFileId, cancellationToken);
            return Ok(new
            {
                fileId,
                downloadUrl = Url.Action(nameof(DownloadExportFile), values: new { fileId })
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("export/{fileId}")]
    public IActionResult DownloadExportFile(string fileId)
    {
        var (path, downloadFileName) = _youtubeCommentsService.ResolveCsvFile(fileId);
        if (!System.IO.File.Exists(path))
        {
            return NotFound("找不到匯出檔案，請重新執行匯出。");
        }

        var stream = System.IO.File.OpenRead(path);
        return File(stream, "text/csv", downloadFileName);
    }
}
