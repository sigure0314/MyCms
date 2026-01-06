using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class RolesController : ControllerBase {
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context) {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleResponse>>> GetRoles() {
        var roles = await _context.Roles
            .Include(r => r.Users)
            .Select(r => new RoleResponse(r.Id, r.Name, r.Users.Count))
            .OrderBy(r => r.Id)
            .ToListAsync();

        return Ok(roles);
    }

    [HttpPost]
    public async Task<ActionResult<RoleResponse>> CreateRole(RoleUpsertRequest request) {
        if (string.IsNullOrWhiteSpace(request.Name)) {
            return BadRequest("Role name is required.");
        }

        var normalizedName = request.Name.Trim();
        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == normalizedName.ToLower());
        if (exists) {
            return BadRequest("Role name already exists.");
        }

        var role = new Role { Name = normalizedName };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRoles), new RoleResponse(role.Id, role.Name, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RoleResponse>> UpdateRole(int id, RoleUpsertRequest request) {
        if (string.IsNullOrWhiteSpace(request.Name)) {
            return BadRequest("Role name is required.");
        }

        var role = await _context.Roles.FindAsync(id);
        if (role == null) {
            return NotFound();
        }

        var normalizedName = request.Name.Trim();
        var exists = await _context.Roles.AnyAsync(r => r.Id != id && r.Name.ToLower() == normalizedName.ToLower());
        if (exists) {
            return BadRequest("Role name already exists.");
        }

        role.Name = normalizedName;
        await _context.SaveChangesAsync();

        var userCount = await _context.Users.CountAsync(u => u.RoleId == id);
        return Ok(new RoleResponse(role.Id, role.Name, userCount));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id) {
        var role = await _context.Roles.Include(r => r.Users).FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) {
            return NotFound();
        }

        if (role.Users.Count > 0) {
            return BadRequest("Role has assigned users and cannot be deleted.");
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
