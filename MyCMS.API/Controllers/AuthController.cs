using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase {
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;
    private readonly IOnlineUserTracker _onlineUserTracker;

    public AuthController(AppDbContext context, TokenService tokenService, IOnlineUserTracker onlineUserTracker) {
        _context = context;
        _tokenService = tokenService;
        _onlineUserTracker = onlineUserTracker;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req) {
        var normalizedUsername = req.Username?.Trim() ?? string.Empty;
        var normalizedEmail = req.Email?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(normalizedUsername) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(normalizedEmail)) {
            return BadRequest("Username, email and password are required");
        }

        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == normalizedUsername.ToLower())) return BadRequest("User exists");
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail.ToLower())) return BadRequest("Email exists");
        
        var user = new User {
            Username = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            RoleId = 2 // Default Editor
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        
        var userWithRole = await _context.Users
            .Include(u => u.Role)
            .ThenInclude(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .FirstAsync(u => u.Id == user.Id);
        var permissions = GetPermissionCodes(userWithRole.Role);

        return Ok(new AuthResponse { 
            Token = _tokenService.CreateToken(userWithRole, permissions),
            Username = userWithRole.Username,
            Role = userWithRole.Role.Name
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req) {
        var credential = req.Username?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(credential) || string.IsNullOrWhiteSpace(req.Password)) {
            return BadRequest("Username/email and password are required");
        }

        var user = await _context.Users
            .Include(u => u.Role)
            .ThenInclude(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u =>
                u.Username.ToLower() == credential.ToLower() ||
                u.Email.ToLower() == credential.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return Unauthorized();
        if (user.Role == null) return Unauthorized("User role not configured");
        var permissions = GetPermissionCodes(user.Role);

        var loginIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        await _onlineUserTracker.RecordLoginAsync(user.Username, loginIp);
        
        return Ok(new AuthResponse { 
            Token = _tokenService.CreateToken(user, permissions),
            Username = user.Username,
            Role = user.Role.Name
        });
    }

    [HttpPost("guest")]
    public async Task<ActionResult<AuthResponse>> GuestLogin() {
        var guestRole = await _context.Roles
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Name.ToLower() == "guest");
        if (guestRole == null) {
            return BadRequest("Guest role not configured");
        }

        var username = $"guest_{Guid.NewGuid():N}";
        var permissions = GetPermissionCodes(guestRole);

        var loginIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        await _onlineUserTracker.RecordLoginAsync(username, loginIp);

        return Ok(new AuthResponse {
            Token = _tokenService.CreateToken(Guid.NewGuid().ToString("N"), username, guestRole.Name, permissions),
            Username = username,
            Role = guestRole.Name
        });
    }

    private static List<string> GetPermissionCodes(Role role) {
        return role.RolePermissions
            .Where(rp => rp.IsAllowed && rp.Permission.IsEnabled)
            .Select(rp => rp.Permission.Code)
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
