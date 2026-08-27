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

public record TaiwanInstitutionalTradingSnapshot(
    string StockNo,
    string Name,
    DateTime? TradeDate,
    long ForeignInvestorBuy,
    long ForeignInvestorSell,
    long ForeignInvestorNet,
    long InvestmentTrustBuy,
    long InvestmentTrustSell,
    long InvestmentTrustNet,
    long DealerBuy,
    long DealerSell,
    long DealerNet,
    long TotalNet,
    string Source
);

public record TaiwanMarginTradingSnapshot(
    string StockNo,
    string Name,
    DateTime? TradeDate,
    long MarginBuy,
    long MarginSell,
    long MarginCashRedemption,
    long MarginPreviousBalance,
    long MarginCurrentBalance,
    long MarginChange,
    long ShortBuy,
    long ShortSell,
    long ShortStockRedemption,
    long ShortPreviousBalance,
    long ShortCurrentBalance,
    long ShortChange,
    long OffsetLoanAndShort,
    string Note,
    DateTime UpdatedAt,
    string Source
);
