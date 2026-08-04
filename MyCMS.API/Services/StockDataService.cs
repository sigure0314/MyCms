using System.Globalization;
using System.Text.Json;
using MyCMS.API.DTOs;

namespace MyCMS.API.Services;

public interface IStockDataService
{
    Task<TaiwanStockKLineResponse> GetTaiwanStockDailyKLineAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanStockOpenDataSnapshot> GetTaiwanStockSnapshotAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanInstitutionalTradingSnapshot> GetInstitutionalTradingAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanMarginTradingSnapshot> GetMarginTradingAsync(string stockNo, CancellationToken cancellationToken = default);
}

public class StockDataService : IStockDataService
{
    private const string TwseEndpoint = "https://www.twse.com.tw/exchangeReport/STOCK_DAY";
    private const string TwseOpenApiBaseUrl = "https://openapi.twse.com.tw/v1";
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

    public async Task<TaiwanStockOpenDataSnapshot> GetTaiwanStockSnapshotAsync(
        string stockNo,
        CancellationToken cancellationToken = default)
    {
        var normalizedStockNo = stockNo.Trim();
        var quoteTask = FetchOpenApiRowsAsync("exchangeReport/STOCK_DAY_ALL", cancellationToken);
        var valuationTask = FetchOpenApiRowsAsync("exchangeReport/BWIBBU_ALL", cancellationToken);
        await Task.WhenAll(quoteTask, valuationTask);

        var quote = quoteTask.Result.FirstOrDefault(row => GetValue(row, "Code") == normalizedStockNo)
            ?? throw new InvalidOperationException($"No TWSE open data found for stockNo {normalizedStockNo}.");
        var valuation = valuationTask.Result.FirstOrDefault(row => GetValue(row, "Code") == normalizedStockNo);

        var close = ParseRequiredDecimal(quote, "ClosingPrice");
        var change = ParseSignedDecimal(GetValue(quote, "Change"));
        var previousClose = close - change;
        var changePercent = previousClose == 0 ? 0 : change / previousClose * 100;

        return new TaiwanStockOpenDataSnapshot(
            normalizedStockNo,
            GetValue(quote, "Name"),
            "上市 · TWSE",
            close,
            change,
            changePercent,
            ParseRequiredDecimal(quote, "OpeningPrice"),
            ParseRequiredDecimal(quote, "HighestPrice"),
            ParseRequiredDecimal(quote, "LowestPrice"),
            previousClose,
            ParseRequiredLong(quote, "TradeVolume"),
            ParseRequiredDecimal(quote, "TradeValue"),
            ParseNullableDecimal(valuation, "PEratio"),
            ParseNullableDecimal(valuation, "PBratio"),
            ParseNullableDecimal(valuation, "DividendYield"),
            DateTime.UtcNow,
            "臺灣證券交易所 OpenAPI"
        );
    }

    public async Task<TaiwanInstitutionalTradingSnapshot> GetInstitutionalTradingAsync(
        string stockNo,
        CancellationToken cancellationToken = default)
    {
        var normalizedStockNo = stockNo.Trim();
        var rows = await FetchOpenApiRowsAsync("fund/T86", cancellationToken);
        var row = rows.FirstOrDefault(item => GetFirstValue(item, "Code", "證券代號") == normalizedStockNo)
            ?? throw new InvalidOperationException($"No TWSE institutional trading data found for stockNo {normalizedStockNo}.");

        var foreignBuy = ParseLong(row,
            "ForeignInvestmentExcludingForeignDealerBuy", "外陸資買進股數(不含外資自營商)");
        var foreignSell = ParseLong(row,
            "ForeignInvestmentExcludingForeignDealerSell", "外陸資賣出股數(不含外資自營商)");
        var foreignNet = ParseLong(row,
            "ForeignInvestmentExcludingForeignDealerNetBuySell", "外陸資買賣超股數(不含外資自營商)");
        var trustBuy = ParseLong(row, "InvestmentTrustBuy", "投信買進股數");
        var trustSell = ParseLong(row, "InvestmentTrustSell", "投信賣出股數");
        var trustNet = ParseLong(row, "InvestmentTrustNetBuySell", "投信買賣超股數");
        var dealerBuy = ParseLongWithFallbackSum(
            row,
            new[] { "DealerBuy", "自營商買進股數" },
            new[] { "DealerSelfBuy", "自營商自行買賣買進股數" },
            new[] { "DealerHedgingBuy", "自營商避險買進股數" });
        var dealerSell = ParseLongWithFallbackSum(
            row,
            new[] { "DealerSell", "自營商賣出股數" },
            new[] { "DealerSelfSell", "自營商自行買賣賣出股數" },
            new[] { "DealerHedgingSell", "自營商避險賣出股數" });
        var dealerNet = ParseLong(row, "DealerNetBuySell", "自營商買賣超股數");
        var totalNet = ParseLong(row, "TotalNetBuySell", "三大法人買賣超股數");

        return new TaiwanInstitutionalTradingSnapshot(
            normalizedStockNo,
            GetFirstValue(row, "Name", "證券名稱"),
            ParseOpenApiDate(GetFirstValue(row, "Date", "日期")),
            foreignBuy,
            foreignSell,
            foreignNet,
            trustBuy,
            trustSell,
            trustNet,
            dealerBuy,
            dealerSell,
            dealerNet,
            totalNet,
            "臺灣證券交易所 OpenAPI fund/T86"
        );
    }

    public async Task<TaiwanMarginTradingSnapshot> GetMarginTradingAsync(
        string stockNo,
        CancellationToken cancellationToken = default)
    {
        var normalizedStockNo = stockNo.Trim();
        var rows = await FetchOpenApiRowsAsync("exchangeReport/MI_MARGN", cancellationToken);
        var row = rows.FirstOrDefault(item => GetFirstValue(item, "Code", "股票代號") == normalizedStockNo)
            ?? throw new InvalidOperationException($"No TWSE margin trading data found for stockNo {normalizedStockNo}.");

        var marginPreviousBalance = ParseLong(row, "MarginPurchaseYesterdayBalance", "融資前日餘額");
        var marginCurrentBalance = ParseLong(row, "MarginPurchaseTodayBalance", "融資今日餘額");
        var shortPreviousBalance = ParseLong(row, "ShortSaleYesterdayBalance", "融券前日餘額");
        var shortCurrentBalance = ParseLong(row, "ShortSaleTodayBalance", "融券今日餘額");

        return new TaiwanMarginTradingSnapshot(
            normalizedStockNo,
            GetFirstValue(row, "Name", "股票名稱"),
            ParseOpenApiDate(GetFirstValue(row, "Date", "日期")),
            ParseLong(row, "MarginPurchaseBuy", "融資買進"),
            ParseLong(row, "MarginPurchaseSell", "融資賣出"),
            ParseLong(row, "MarginPurchaseCashRedemption", "現金償還"),
            marginPreviousBalance,
            marginCurrentBalance,
            marginCurrentBalance - marginPreviousBalance,
            ParseLong(row, "ShortSaleBuy", "融券買進"),
            ParseLong(row, "ShortSaleSell", "融券賣出"),
            ParseLong(row, "ShortSaleStockRedemption", "ShortSaleCashRedemption", "現券償還"),
            shortPreviousBalance,
            shortCurrentBalance,
            shortCurrentBalance - shortPreviousBalance,
            ParseLong(row, "OffsetLoanAndShort", "資券互抵"),
            GetFirstValue(row, "Note", "註記"),
            DateTime.UtcNow,
            "臺灣證券交易所 OpenAPI exchangeReport/MI_MARGN"
        );
    }

    private async Task<IReadOnlyList<Dictionary<string, string>>> FetchOpenApiRowsAsync(
        string resource,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync($"{TwseOpenApiBaseUrl}/{resource}", cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await JsonSerializer.DeserializeAsync<List<Dictionary<string, string>>>(stream, cancellationToken: cancellationToken)
            ?? [];
    }

    private static string GetValue(IReadOnlyDictionary<string, string>? row, string key) =>
        row is not null && row.TryGetValue(key, out var value) ? value.Trim() : string.Empty;

    private static string GetFirstValue(IReadOnlyDictionary<string, string> row, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = GetValue(row, key);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static long ParseLong(IReadOnlyDictionary<string, string> row, params string[] keys) =>
        TryParseLong(GetFirstValue(row, keys), out var value) ? value : 0;

    private static long ParseLongWithFallbackSum(
        IReadOnlyDictionary<string, string> row,
        string[] totalKeys,
        string[] firstPartKeys,
        string[] secondPartKeys)
    {
        var totalRaw = GetFirstValue(row, totalKeys);
        return TryParseLong(totalRaw, out var total)
            ? total
            : ParseLong(row, firstPartKeys) + ParseLong(row, secondPartKeys);
    }

    private static DateTime? ParseOpenApiDate(string raw)
    {
        if (raw.Length == 7 &&
            int.TryParse(raw[..3], out var rocYear) &&
            int.TryParse(raw.Substring(3, 2), out var rocMonth) &&
            int.TryParse(raw.Substring(5, 2), out var rocDay))
        {
            return new DateTime(rocYear + 1911, rocMonth, rocDay, 0, 0, 0, DateTimeKind.Utc);
        }

        var formats = new[] { "yyyyMMdd", "yyyy-MM-dd", "yyyy/MM/dd" };
        return DateTime.TryParseExact(
            raw,
            formats,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal,
            out var date)
            ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
            : null;
    }

    private static decimal ParseRequiredDecimal(IReadOnlyDictionary<string, string> row, string key) =>
        TryParseDecimal(GetValue(row, key), out var value) ? value : 0;

    private static long ParseRequiredLong(IReadOnlyDictionary<string, string> row, string key) =>
        TryParseLong(GetValue(row, key), out var value) ? value : 0;

    private static decimal? ParseNullableDecimal(IReadOnlyDictionary<string, string>? row, string key) =>
        TryParseDecimal(GetValue(row, key), out var value) ? value : null;

    private static decimal ParseSignedDecimal(string raw)
    {
        var normalized = raw.Replace("+", string.Empty, StringComparison.Ordinal).Trim();
        return TryParseDecimal(normalized, out var value) ? value : 0;
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
