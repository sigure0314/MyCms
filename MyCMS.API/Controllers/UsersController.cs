using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // 只有需要權限的操作才需登入
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetUsers()
    {
        // 這裡我們只選取需要的欄位，不要把 PasswordHash 傳給前端，這樣才安全
        var users = await _context.Users
            .Include(u => u.Role) // 順便把關聯的角色名稱抓出來
            .Select(u => new 
            {
                u.Id,
                u.Username,
                u.Email,
                Role = u.Role.Name,
                u.RoleId
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    [Authorize(Policy = "Permission:api.users.create")]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Username and email are required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Password is required.");
        }

        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return BadRequest("User exists");
        }

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest("Email exists");
        }

        var role = await _context.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return BadRequest("Role not found.");
        }

        var user = new Models.User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        return CreatedAtAction(nameof(GetUsers), new
        {
            user.Id,
            user.Username,
            user.Email,
            Role = user.Role.Name,
            user.RoleId
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Permission:api.users.update")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Username and email are required.");
        }

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        if (await _context.Users.AnyAsync(u => u.Id != id && u.Username == request.Username))
        {
            return BadRequest("User exists");
        }

        if (await _context.Users.AnyAsync(u => u.Id != id && u.Email == request.Email))
        {
            return BadRequest("Email exists");
        }

        var role = await _context.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return BadRequest("Role not found.");
        }

        user.Username = request.Username;
        user.Email = request.Email;
        user.RoleId = role.Id;
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            Role = user.Role.Name,
            user.RoleId
        });
    }

    [HttpPatch("{id:int}/role")]
    [Authorize(Policy = "Permission:api.users.update-role")]
    public async Task<IActionResult> UpdateUserRole(int id, UpdateUserRoleRequest request)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        var role = await _context.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return BadRequest("Role not found.");
        }

        user.RoleId = role.Id;
        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            Role = user.Role.Name
        });
    }
}
