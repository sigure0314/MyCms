using System.Globalization;
using System.Text.Json;
using MyCMS.API.DTOs;

namespace MyCMS.API.Services;

public interface IStockDataService
{
    Task<TaiwanStockKLineResponse> GetTaiwanStockDailyKLineAsync(string stockNo, CancellationToken cancellationToken = default);
}

public class StockDataService : IStockDataService
{
    private const string TwseEndpoint = "https://www.twse.com.tw/exchangeReport/STOCK_DAY";
    private readonly HttpClient _httpClient;

    public StockDataService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<TaiwanStockKLineResponse> GetTaiwanStockDailyKLineAsync(string stockNo, CancellationToken cancellationToken = default)
    {
        var normalizedStockNo = stockNo.Trim();
        var today = DateTime.UtcNow;

        var allPoints = new List<TaiwanStockKLinePoint>();
        for (var monthOffset = 0; monthOffset < 6; monthOffset++)
        {
            var month = today.AddMonths(-monthOffset);
            var rows = await FetchMonthRowsAsync(normalizedStockNo, month, cancellationToken);

            foreach (var row in rows)
            {
                var point = MapRowToKLine(row);
                if (point is not null)
                {
                    allPoints.Add(point);
                }
            }
        }

        var points = allPoints
            .GroupBy(x => x.Date)
            .Select(x => x.First())
            .OrderBy(x => x.Date)
            .ToList();

        if (points.Count == 0)
        {
            throw new InvalidOperationException($"No TWSE data found for stockNo {normalizedStockNo}.");
        }

        return new TaiwanStockKLineResponse(normalizedStockNo, points);
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> FetchMonthRowsAsync(string stockNo, DateTime month, CancellationToken cancellationToken)
    {
        var date = new DateTime(month.Year, month.Month, 1);
        var dateParam = date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        var url = $"{TwseEndpoint}?response=json&date={dateParam}&stockNo={stockNo}";

        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!json.RootElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<IReadOnlyList<string>>();
        }

        var rows = new List<IReadOnlyList<string>>();
        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var values = row.EnumerateArray().Select(x => x.GetString() ?? string.Empty).ToList();
            rows.Add(values);
        }

        return rows;
    }

    private static TaiwanStockKLinePoint? MapRowToKLine(IReadOnlyList<string> row)
    {
        if (row.Count < 7 ||
            !TryParseRocDate(row[0], out var date) ||
            !TryParseLong(row[1], out var volume) ||
            !TryParseDecimal(row[3], out var open) ||
            !TryParseDecimal(row[4], out var high) ||
            !TryParseDecimal(row[5], out var low) ||
            !TryParseDecimal(row[6], out var close))
        {
            return null;
        }

        return new TaiwanStockKLinePoint(date, open, high, low, close, volume);
    }

    private static bool TryParseRocDate(string rocDate, out DateTime date)
    {
        date = default;
        var parts = rocDate.Split('/');
        if (parts.Length != 3)
        {
            return false;
        }

        if (!int.TryParse(parts[0], out var rocYear) ||
            !int.TryParse(parts[1], out var month) ||
            !int.TryParse(parts[2], out var day))
        {
            return false;
        }

        var gregorianYear = rocYear + 1911;
        date = new DateTime(gregorianYear, month, day, 0, 0, 0, DateTimeKind.Utc);
        return true;
    }

    private static bool TryParseDecimal(string raw, out decimal value)
    {
        var cleaned = raw.Replace(",", string.Empty).Trim();
        if (cleaned is "--" or "X0.00")
        {
            value = default;
            return false;
        }

        return decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out value);
    }

    private static bool TryParseLong(string raw, out long value)
    {
        var cleaned = raw.Replace(",", string.Empty).Trim();
        return long.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out value);
    }
}
