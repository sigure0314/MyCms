namespace MyCMS.API.DTOs;

public record MovingAveragePoint(DateTime Time, decimal Value);

public record StockChartResponse(
    string Symbol,
    IReadOnlyList<StockPricePoint> Prices,
    IReadOnlyList<MovingAveragePoint> Ma5,
    IReadOnlyList<MovingAveragePoint> Ma20
);

public record StockPricePoint(
    DateTime Time,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    long Volume
);
