namespace MyCMS.API.DTOs;

public record RoleResponse(int Id, string Name, int UserCount);
public record RoleUpsertRequest(string Name);
public record UpdateUserRoleRequest(int RoleId);
