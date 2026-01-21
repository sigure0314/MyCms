using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OnlineUsersController : ControllerBase
{
    private readonly IOnlineUserTracker _onlineUserTracker;

    public OnlineUsersController(IOnlineUserTracker onlineUserTracker)
    {
        _onlineUserTracker = onlineUserTracker;
    }

    [HttpGet]
    [Authorize(Policy = "Permission:api.users.get")]
    public async Task<ActionResult<IReadOnlyList<OnlineUserDto>>> GetOnlineUsers()
    {
        var users = await _onlineUserTracker.GetOnlineUsersAsync();
        return Ok(users);
    }

    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat(OnlineUserHeartbeatRequest request)
    {
        var username = User.FindFirstValue(JwtRegisteredClaimNames.UniqueName) ??
                       User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(username))
        {
            return Unauthorized();
        }

        var currentPage = string.IsNullOrWhiteSpace(request.CurrentPage) ? "/" : request.CurrentPage;
        await _onlineUserTracker.UpdateActivityAsync(username, currentPage);
        return Ok();
    }
}
