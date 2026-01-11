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
            RoleId = 2, // Default Editor
            Status = UserStatus.Pending
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        
        // Reload role for token generation
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        return Ok(new AuthResponse
        {
            Token = string.Empty,
            Username = user.Username,
            Role = user.Role.Name,
            Status = user.Status.ToString()
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req) {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return Unauthorized();
        if (user.Status != UserStatus.Approved) return Forbid();
        
        return Ok(new AuthResponse { 
            Token = _tokenService.CreateToken(user), 
            Username = user.Username, 
            Role = user.Role.Name,
            Status = user.Status.ToString()
        });
    }
}
