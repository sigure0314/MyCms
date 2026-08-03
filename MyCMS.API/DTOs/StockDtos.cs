namespace MyCMS.API.DTOs;

public record TaiwanStockKLinePoint(
    DateTime Date,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    long Volume
);

public record TaiwanStockKLineResponse(
    string StockNo,
    IReadOnlyList<TaiwanStockKLinePoint> Data
);

public record TaiwanStockOpenDataSnapshot(
    string StockNo,
    string Name,
    string Market,
    decimal CurrentPrice,
    decimal Change,
    decimal ChangePercent,
    decimal Open,
    decimal High,
    decimal Low,
    decimal PreviousClose,
    long Volume,
    decimal Turnover,
    decimal? PeRatio,
    decimal? PbRatio,
    decimal? DividendYield,
    DateTime UpdatedAt,
    string Source
);
