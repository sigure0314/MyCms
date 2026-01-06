namespace MyCMS.API.DTOs;

public record PermissionResponse(
    int Id,
    int? ParentId,
    string Code,
    string Name,
    byte Type,
    string? RoutePath,
    string? ApiMethod,
    string? ApiPath,
    string? Icon,
    int SortOrder,
    bool IsEnabled
);

public record PermissionUpsertRequest(
    int? ParentId,
    string Code,
    string Name,
    byte Type,
    string? RoutePath,
    string? ApiMethod,
    string? ApiPath,
    string? Icon,
    int SortOrder,
    bool IsEnabled
);

public record UpdateRolePermissionsRequest(List<int> PermissionIds);
