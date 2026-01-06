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
public class PermissionsController : ControllerBase {
    private readonly AppDbContext _context;

    public PermissionsController(AppDbContext context) {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PermissionResponse>>> GetPermissions() {
        var permissions = await _context.Permissions
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Id)
            .Select(p => new PermissionResponse(
                p.Id,
                p.ParentId,
                p.Code,
                p.Name,
                p.Type,
                p.RoutePath,
                p.ApiMethod,
                p.ApiPath,
                p.Icon,
                p.SortOrder,
                p.IsEnabled
            ))
            .ToListAsync();

        return Ok(permissions);
    }

    [HttpPost]
    public async Task<ActionResult<PermissionResponse>> CreatePermission(PermissionUpsertRequest request) {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name)) {
            return BadRequest("Permission code and name are required.");
        }

        var normalizedCode = request.Code.Trim();
        var exists = await _context.Permissions.AnyAsync(p => p.Code.ToLower() == normalizedCode.ToLower());
        if (exists) {
            return BadRequest("Permission code already exists.");
        }

        var permission = new Permission {
            ParentId = request.ParentId,
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Type = request.Type,
            RoutePath = request.RoutePath?.Trim(),
            ApiMethod = request.ApiMethod?.Trim(),
            ApiPath = request.ApiPath?.Trim(),
            Icon = request.Icon?.Trim(),
            SortOrder = request.SortOrder,
            IsEnabled = request.IsEnabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPermissions), new PermissionResponse(
            permission.Id,
            permission.ParentId,
            permission.Code,
            permission.Name,
            permission.Type,
            permission.RoutePath,
            permission.ApiMethod,
            permission.ApiPath,
            permission.Icon,
            permission.SortOrder,
            permission.IsEnabled
        ));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PermissionResponse>> UpdatePermission(int id, PermissionUpsertRequest request) {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name)) {
            return BadRequest("Permission code and name are required.");
        }

        var permission = await _context.Permissions.FindAsync(id);
        if (permission == null) {
            return NotFound();
        }

        var normalizedCode = request.Code.Trim();
        var exists = await _context.Permissions.AnyAsync(p => p.Id != id && p.Code.ToLower() == normalizedCode.ToLower());
        if (exists) {
            return BadRequest("Permission code already exists.");
        }

        permission.ParentId = request.ParentId;
        permission.Code = normalizedCode;
        permission.Name = request.Name.Trim();
        permission.Type = request.Type;
        permission.RoutePath = request.RoutePath?.Trim();
        permission.ApiMethod = request.ApiMethod?.Trim();
        permission.ApiPath = request.ApiPath?.Trim();
        permission.Icon = request.Icon?.Trim();
        permission.SortOrder = request.SortOrder;
        permission.IsEnabled = request.IsEnabled;
        permission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new PermissionResponse(
            permission.Id,
            permission.ParentId,
            permission.Code,
            permission.Name,
            permission.Type,
            permission.RoutePath,
            permission.ApiMethod,
            permission.ApiPath,
            permission.Icon,
            permission.SortOrder,
            permission.IsEnabled
        ));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePermission(int id) {
        var permission = await _context.Permissions.FindAsync(id);
        if (permission == null) {
            return NotFound();
        }

        _context.Permissions.Remove(permission);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
