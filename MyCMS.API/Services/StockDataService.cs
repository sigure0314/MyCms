using System.Globalization;
using System.Text;
using System.Text.Json;
using MyCMS.API.DTOs;

namespace MyCMS.API.Services;

public interface IStockDataService
{
    Task<TaiwanStockKLineResponse> GetTaiwanStockDailyKLineAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanStockOpenDataSnapshot> GetTaiwanStockSnapshotAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanInstitutionalTradingSnapshot> GetInstitutionalTradingAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanMarginTradingSnapshot> GetMarginTradingAsync(string stockNo, CancellationToken cancellationToken = default);
    Task<TaiwanShareholdingDistributionSnapshot> GetShareholdingDistributionAsync(string stockNo, CancellationToken cancellationToken = default);
}

public class StockDataService : IStockDataService
{
    private const string TwseEndpoint = "https://www.twse.com.tw/exchangeReport/STOCK_DAY";
    private const string TwseOpenApiBaseUrl = "https://openapi.twse.com.tw/v1";
    private const string TdccDistributionUrl = "https://opendata.tdcc.com.tw/getOD.ashx?id=1-5";
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
        var row = rows.FirstOrDefault(item => GetFirstValue(item, "Code", "股票代號", "證券代號") == normalizedStockNo)
            ?? throw new InvalidOperationException($"No TWSE margin trading data found for stockNo {normalizedStockNo}.");

        var financingPrevious = ParseLong(row, "MarginPurchaseYesterdayBalance", "融資前日餘額");
        var financingBalance = ParseLong(row, "MarginPurchaseTodayBalance", "融資今日餘額");
        var shortPrevious = ParseLong(row, "ShortSaleYesterdayBalance", "融券前日餘額");
        var shortBalance = ParseLong(row, "ShortSaleTodayBalance", "融券今日餘額");

        return new TaiwanMarginTradingSnapshot(
            normalizedStockNo,
            GetFirstValue(row, "Name", "股票名稱", "證券名稱"),
            DateTime.UtcNow.Date,
            financingPrevious,
            financingBalance,
            financingBalance - financingPrevious,
            shortPrevious,
            shortBalance,
            shortBalance - shortPrevious,
            "臺灣證券交易所 OpenAPI exchangeReport/MI_MARGN");
    }

    public async Task<TaiwanShareholdingDistributionSnapshot> GetShareholdingDistributionAsync(
        string stockNo,
        CancellationToken cancellationToken = default)
    {
        var normalizedStockNo = stockNo.Trim();
        using var response = await _httpClient.GetAsync(TdccDistributionUrl, cancellationToken);
        response.EnsureSuccessStatusCode();
        var csv = await response.Content.ReadAsStringAsync(cancellationToken);
        var records = ParseCsv(csv);
        if (records.Count < 2)
        {
            throw new InvalidOperationException("TDCC shareholding distribution returned no data.");
        }

        var header = records[0].Select((name, index) => (Name: name.Trim().Trim('\ufeff'), Index: index))
            .ToDictionary(x => x.Name, x => x.Index, StringComparer.OrdinalIgnoreCase);
        var codeIndex = FindColumn(header, "證券代號", "股票代號", "Security Code");
        var levelIndex = FindColumn(header, "持股分級", "持股分級序號", "Holding Level");
        var holdersIndex = FindColumn(header, "人數", "股東人數", "Number of Holders");
        var sharesIndex = FindColumn(header, "股數", "持有股數", "Shares");
        var percentageIndex = FindColumn(header, "占集保庫存數比例%", "占集保庫存數比例", "Percentage");
        var dateIndex = FindColumn(header, "資料日期", "日期", "Date");

        var buckets = new[]
        {
            new DistributionBucket("1–10 張", 1, 3),
            new DistributionBucket("11–50 張", 4, 8),
            new DistributionBucket("51–100 張", 9, 9),
            new DistributionBucket("101–400 張", 10, 11),
            new DistributionBucket("400 張以上", 12, 15)
        };
        DateTime? dataDate = null;
        foreach (var record in records.Skip(1).Where(record => GetCsvValue(record, codeIndex) == normalizedStockNo))
        {
            if (!int.TryParse(GetCsvValue(record, levelIndex), out var level) || level is < 1 or > 15)
            {
                continue;
            }

            var bucket = buckets.First(item => level >= item.MinLevel && level <= item.MaxLevel);
            bucket.Holders += ParseCsvLong(GetCsvValue(record, holdersIndex));
            bucket.Shares += ParseCsvLong(GetCsvValue(record, sharesIndex));
            bucket.Percentage += ParseCsvDecimal(GetCsvValue(record, percentageIndex));
            dataDate ??= ParseDistributionDate(GetCsvValue(record, dateIndex));
        }

        if (buckets.All(bucket => bucket.Holders == 0 && bucket.Shares == 0 && bucket.Percentage == 0))
        {
            throw new InvalidOperationException($"No TDCC distribution found for stockNo {normalizedStockNo}.");
        }

        return new TaiwanShareholdingDistributionSnapshot(
            normalizedStockNo,
            dataDate,
            buckets.Select(bucket => new TaiwanShareholdingDistributionItem(
                bucket.Range, bucket.Percentage, bucket.Holders, bucket.Shares)).ToList(),
            "臺灣集中保管結算所 集保戶股權分散表");
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

    private static int FindColumn(IReadOnlyDictionary<string, int> header, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            if (header.TryGetValue(candidate, out var index)) return index;
        }
        throw new InvalidOperationException($"Open data is missing column: {string.Join('/', candidates)}");
    }

    private static string GetCsvValue(IReadOnlyList<string> row, int index) =>
        index >= 0 && index < row.Count ? row[index].Trim() : string.Empty;

    private static long ParseCsvLong(string raw) =>
        long.TryParse(raw.Replace(",", string.Empty), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) ? value : 0;

    private static decimal ParseCsvDecimal(string raw) =>
        decimal.TryParse(raw.Replace("%", string.Empty), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : 0;

    private static DateTime? ParseDistributionDate(string raw)
    {
        var formats = new[] { "yyyyMMdd", "yyyy/MM/dd", "yyyy-MM-dd" };
        return DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date)
            ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
            : null;
    }

    private static List<List<string>> ParseCsv(string csv)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < csv.Length; i++)
        {
            var character = csv[i];
            if (character == '"')
            {
                if (quoted && i + 1 < csv.Length && csv[i + 1] == '"') { field.Append('"'); i++; }
                else quoted = !quoted;
            }
            else if (character == ',' && !quoted) { row.Add(field.ToString()); field.Clear(); }
            else if ((character == '\r' || character == '\n') && !quoted)
            {
                if (character == '\r' && i + 1 < csv.Length && csv[i + 1] == '\n') i++;
                row.Add(field.ToString()); field.Clear();
                if (row.Any(value => !string.IsNullOrWhiteSpace(value))) rows.Add(row);
                row = new List<string>();
            }
            else field.Append(character);
        }
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); rows.Add(row); }
        return rows;
    }

    private sealed class DistributionBucket(string range, int minLevel, int maxLevel)
    {
        public string Range { get; } = range;
        public int MinLevel { get; } = minLevel;
        public int MaxLevel { get; } = maxLevel;
        public long Holders { get; set; }
        public long Shares { get; set; }
        public decimal Percentage { get; set; }
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
