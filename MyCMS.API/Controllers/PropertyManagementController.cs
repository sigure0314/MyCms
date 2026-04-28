using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Models;

namespace MyCMS.API.Controllers;

[Route("api/property-management")]
[ApiController]
[Authorize]
public class PropertyManagementController : ControllerBase {
    private readonly AppDbContext _context;

    public PropertyManagementController(AppDbContext context) {
        _context = context;
    }

    [HttpGet("areas")]
    public async Task<ActionResult<IEnumerable<PropertyAreaResponse>>> GetAreas([FromQuery] PropertyTaskCategory? category) {
        var query = _context.PropertyManagementAreas.AsQueryable();
        if (category.HasValue) {
            query = query.Where(a => a.Category == category.Value);
        }

        var areas = await query
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Name)
            .ToListAsync();

        return Ok(areas.Select(MapArea));
    }

    [HttpPost("areas")]
    public async Task<ActionResult<PropertyAreaResponse>> CreateArea([FromBody] PropertyAreaCreateRequest request) {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Location)) {
            return BadRequest("區域名稱與位置不可為空白。");
        }

        var area = new PropertyManagementArea {
            Name = request.Name.Trim(),
            Location = request.Location.Trim(),
            Category = request.Category,
            QrToken = Guid.NewGuid().ToString("N"),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.PropertyManagementAreas.Add(area);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAreas), MapArea(area));
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<PropertyDashboardSummaryResponse>> GetDashboard() {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var todayLogs = await _context.PropertyCheckInLogs
            .Include(l => l.Area)
            .Include(l => l.User)
            .Where(l => l.CheckInAtUtc >= today && l.CheckInAtUtc < tomorrow)
            .OrderByDescending(l => l.CheckInAtUtc)
            .ToListAsync();

        var categoryStats = todayLogs
            .GroupBy(l => GetCategoryName(l.Area.Category))
            .ToDictionary(g => g.Key, g => g.Count());

        var recent = todayLogs
            .Take(10)
            .Select(MapHistoryItem)
            .ToList();

        return Ok(new PropertyDashboardSummaryResponse(
            DateUtc: today,
            TodayCompletedCount: todayLogs.Count,
            CategoryStats: categoryStats,
            RecentActivities: recent
        ));
    }

    [HttpGet("history")]
    public async Task<ActionResult<PropertyCheckInHistoryResponse>> GetHistory(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] PropertyTaskCategory? category,
        [FromQuery] string? username,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50
    ) {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _context.PropertyCheckInLogs
            .Include(l => l.Area)
            .Include(l => l.User)
            .AsQueryable();

        if (fromUtc.HasValue) {
            query = query.Where(l => l.CheckInAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue) {
            query = query.Where(l => l.CheckInAtUtc <= toUtc.Value);
        }

        if (category.HasValue) {
            query = query.Where(l => l.Area.Category == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(username)) {
            var keyword = username.Trim().ToLower();
            query = query.Where(l => l.User.Username.ToLower().Contains(keyword));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.CheckInAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PropertyCheckInHistoryResponse(totalCount, items.Select(MapHistoryItem).ToList()));
    }

    [HttpPost("checkin")]
    public async Task<ActionResult<PropertyCheckInResponse>> CheckIn([FromBody] PropertyCheckInRequest request) {
        if (string.IsNullOrWhiteSpace(request.QrToken)) {
            return BadRequest("QR Token 不可空白。");
        }

        var area = await _context.PropertyManagementAreas.FirstOrDefaultAsync(a => a.QrToken == request.QrToken.Trim());
        if (area is null) {
            return NotFound("查無對應 QR 區域。");
        }

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.NameId);
        if (!int.TryParse(userIdClaim, out var userId)) {
            return Unauthorized();
        }

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) {
            return Unauthorized();
        }

        if (!CanCheckIn(user.Role.Name, area.Category)) {
            return Forbid();
        }

        var log = new PropertyCheckInLog {
            AreaId = area.Id,
            UserId = userId,
            Note = request.Note?.Trim(),
            CheckInAtUtc = DateTime.UtcNow
        };

        _context.PropertyCheckInLogs.Add(log);
        await _context.SaveChangesAsync();

        return Ok(new PropertyCheckInResponse(
            log.Id,
            area.Id,
            area.Name,
            area.Category,
            GetCategoryName(area.Category),
            log.CheckInAtUtc,
            user.Username
        ));
    }

    private PropertyAreaResponse MapArea(PropertyManagementArea area) {
        var payload = $"{Request.Scheme}://{Request.Host}/property/checkin?token={area.QrToken}";
        var qrImageUrl = $"https://quickchart.io/qr?text={UrlEncoder.Default.Encode(payload)}&size=260";

        return new PropertyAreaResponse(
            area.Id,
            area.Name,
            area.Location,
            area.Category,
            GetCategoryName(area.Category),
            area.QrToken,
            payload,
            qrImageUrl,
            area.CreatedAtUtc
        );
    }

    private static bool CanCheckIn(string roleName, PropertyTaskCategory category) {
        var normalized = roleName.Trim().ToLowerInvariant();

        if (normalized is "admin" or "管理員") {
            return true;
        }

        if (normalized is "機電人員" or "me-technician" or "technician") {
            return category is PropertyTaskCategory.ElectroMechanical or PropertyTaskCategory.LowVoltage or PropertyTaskCategory.FireSafety;
        }

        if (normalized is "清潔人員" or "cleaner") {
            return category == PropertyTaskCategory.Cleaning;
        }

        return false;
    }

    private static PropertyCheckInHistoryItem MapHistoryItem(PropertyCheckInLog log) {
        return new PropertyCheckInHistoryItem(
            log.Id,
            log.AreaId,
            log.Area.Name,
            log.Area.Location,
            log.Area.Category,
            GetCategoryName(log.Area.Category),
            log.User.Username,
            log.CheckInAtUtc,
            log.Note
        );
    }

    private static string GetCategoryName(PropertyTaskCategory category) {
        return category switch {
            PropertyTaskCategory.ElectroMechanical => "機電保修",
            PropertyTaskCategory.LowVoltage => "弱電保修",
            PropertyTaskCategory.FireSafety => "消防安檢",
            PropertyTaskCategory.Cleaning => "清潔區域",
            _ => category.ToString()
        };
    }
}
