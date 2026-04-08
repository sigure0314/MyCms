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
