using MyCMS.API.Models;

namespace MyCMS.API.DTOs;

public record PropertyAreaCreateRequest(
    string Name,
    string Location,
    PropertyTaskCategory Category
);

public record PropertyAreaResponse(
    int Id,
    string Name,
    string Location,
    PropertyTaskCategory Category,
    string CategoryName,
    string QrToken,
    string QrCodePayload,
    string QrCodeImageUrl,
    DateTime CreatedAtUtc
);

public record PropertyCheckInRequest(
    string QrToken,
    string? Note
);

public record PropertyCheckInResponse(
    int LogId,
    int AreaId,
    string AreaName,
    PropertyTaskCategory Category,
    string CategoryName,
    DateTime CheckInAtUtc,
    string Username
);

public record PropertyDashboardSummaryResponse(
    DateTime DateUtc,
    int TodayCompletedCount,
    Dictionary<string, int> CategoryStats,
    IReadOnlyCollection<PropertyCheckInHistoryItem> RecentActivities
);

public record PropertyCheckInHistoryItem(
    int LogId,
    int AreaId,
    string AreaName,
    string Location,
    PropertyTaskCategory Category,
    string CategoryName,
    string Username,
    DateTime CheckInAtUtc,
    string? Note
);

public record PropertyCheckInHistoryResponse(
    int TotalCount,
    IReadOnlyCollection<PropertyCheckInHistoryItem> Items
);
