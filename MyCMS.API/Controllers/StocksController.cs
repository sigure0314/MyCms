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
