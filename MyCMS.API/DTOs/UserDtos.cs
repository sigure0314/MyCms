namespace MyCMS.API.DTOs;

public record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    int RoleId
);

public record UpdateUserRequest(
    string Username,
    string Email,
    int RoleId,
    string? Password
);
