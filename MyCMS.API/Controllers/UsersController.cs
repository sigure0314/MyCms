using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // 🔒 加上這行，只有登入的人才能看！
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
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
                Role = u.Role.Name
            })
            .ToListAsync();

        return Ok(users);
    }
}