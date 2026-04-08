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

    [HttpGet("{symbol}")]
    public async Task<ActionResult<StockChartResponse>> GetStockChart(string symbol, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol is required.");
        }

        var chart = await _stockDataService.GetStockChartAsync(symbol, cancellationToken);
        return Ok(chart);
    }
}
