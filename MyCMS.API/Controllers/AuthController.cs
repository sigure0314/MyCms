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

    public AuthController(AppDbContext context, TokenService tokenService) {
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req) {
        if (await _context.Users.AnyAsync(u => u.Username == req.Username)) return BadRequest("User exists");
        
        var user = new User {
            Username = req.Username,
            Email = req.Email,
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
        var user = await _context.Users
            .Include(u => u.Role)
            .ThenInclude(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return Unauthorized();
        var permissions = GetPermissionCodes(user.Role);
        
        return Ok(new AuthResponse { 
            Token = _tokenService.CreateToken(user, permissions),
            Username = user.Username,
            Role = user.Role.Name
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
