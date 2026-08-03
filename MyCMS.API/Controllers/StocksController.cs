using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/stocks")]
public class StocksController : ControllerBase
{
    private readonly IStockDataService _stockDataService;

    public StocksController(IStockDataService stockDataService)
    {
        _stockDataService = stockDataService;
    }

    [HttpGet("{stockNo}/dashboard")]
    public async Task<ActionResult<TaiwanStockOpenDataSnapshot>> GetStockDashboard(
        string stockNo,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(stockNo))
        {
            return BadRequest(new { message = "股票代號不可為空白。" });
        }

        try
        {
            return Ok(await _stockDataService.GetTaiwanStockSnapshotAsync(stockNo, cancellationToken));
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "查無此股票代號" });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = $"臺灣證券交易所公開資料暫時無法取得：{ex.Message}"
            });
        }
    }

    [HttpGet("{stockNo}")]
    public async Task<ActionResult<TaiwanStockKLineResponse>> GetStockChart(string stockNo, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(stockNo))
        {
            return BadRequest("Stock number is required.");
        }

        try
        {
            var chart = await _stockDataService.GetTaiwanStockDailyKLineAsync(stockNo, cancellationToken);
            return Ok(chart);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = $"TWSE request failed: {ex.Message}" });
        }
    }
}
