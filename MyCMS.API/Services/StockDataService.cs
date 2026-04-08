using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public interface IStockDataService
{
    Task<StockChartResponse> GetStockChartAsync(string symbol, CancellationToken cancellationToken = default);
}

public class StockDataService : IStockDataService
{
    private const int DefaultPeriods = 120;

    public Task<StockChartResponse> GetStockChartAsync(string symbol, CancellationToken cancellationToken = default)
    {
        var normalizedSymbol = string.IsNullOrWhiteSpace(symbol)
            ? "AAPL"
            : symbol.Trim().ToUpperInvariant();

        var prices = GenerateMockPrices(normalizedSymbol, DefaultPeriods);
        var ma5 = CalculateMovingAverage(prices, 5);
        var ma20 = CalculateMovingAverage(prices, 20);

        var response = new StockChartResponse(
            normalizedSymbol,
            prices.Select(p => new StockPricePoint(p.Time, p.Open, p.High, p.Low, p.Close, p.Volume)).ToList(),
            ma5,
            ma20
        );

        return Task.FromResult(response);
    }

    private static List<StockPrice> GenerateMockPrices(string symbol, int periods)
    {
        var seed = symbol.Aggregate(17, (current, ch) => current * 31 + ch);
        var random = new Random(seed);
        var now = DateTime.UtcNow.Date;
        var startDate = now.AddDays(-periods - 20);

        var prices = new List<StockPrice>(periods);
        var lastClose = 140m + (decimal)random.NextDouble() * 60m;

        for (var i = 0; i < periods; i++)
        {
            var time = startDate.AddDays(i + 1);
            var drift = ((decimal)random.NextDouble() - 0.48m) * 4m;
            var open = Math.Max(1m, lastClose + (((decimal)random.NextDouble() - 0.5m) * 2m));
            var close = Math.Max(1m, open + drift);
            var high = Math.Max(open, close) + (decimal)random.NextDouble() * 1.8m;
            var low = Math.Max(0.5m, Math.Min(open, close) - (decimal)random.NextDouble() * 1.8m);
            var volume = random.NextInt64(1_200_000, 8_000_000);

            prices.Add(new StockPrice
            {
                Time = time,
                Open = decimal.Round(open, 2),
                High = decimal.Round(high, 2),
                Low = decimal.Round(low, 2),
                Close = decimal.Round(close, 2),
                Volume = volume
            });

            lastClose = close;
        }

        return prices;
    }

    private static List<MovingAveragePoint> CalculateMovingAverage(IReadOnlyList<StockPrice> prices, int period)
    {
        var result = new List<MovingAveragePoint>();
        if (prices.Count < period)
        {
            return result;
        }

        decimal runningSum = 0m;
        for (var i = 0; i < prices.Count; i++)
        {
            runningSum += prices[i].Close;
            if (i >= period)
            {
                runningSum -= prices[i - period].Close;
            }

            if (i >= period - 1)
            {
                result.Add(new MovingAveragePoint(prices[i].Time, decimal.Round(runningSum / period, 2)));
            }
        }

        return result;
    }
}
