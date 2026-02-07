using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyCMS.API.DTOs;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LiveKitController : ControllerBase
{
    private readonly LiveKitOptions _options;

    public LiveKitController(IOptions<LiveKitOptions> options)
    {
        _options = options.Value;
    }

    [HttpPost("token")]
    public ActionResult<LiveKitTokenResponse> CreateToken([FromBody] LiveKitTokenRequest request)
    {
        if (IsMissingConfiguration(_options.ApiKey, _options.ApiSecret, _options.Url))
        {
            return Problem("LiveKit 設定尚未完成，請確認 appsettings.json 內的 LiveKit 區塊。", statusCode: StatusCodes.Status500InternalServerError);
        }

        var roomName = request.RoomName.Trim();
        if (string.IsNullOrWhiteSpace(roomName))
        {
            return BadRequest("房間名稱不可為空。");
        }

        var username = User.FindFirstValue(JwtRegisteredClaimNames.UniqueName) ?? "guest";
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.NameId) ?? Guid.NewGuid().ToString("N");
        var participantName = string.IsNullOrWhiteSpace(request.ParticipantName)
            ? username
            : request.ParticipantName.Trim();

        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_options.TokenTtlMinutes <= 0 ? 30 : _options.TokenTtlMinutes);
        var videoGrant = new
        {
            room = roomName,
            roomJoin = true,
            canPublish = true,
            canSubscribe = true
        };

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Name, participantName),
            new("video", JsonSerializer.Serialize(videoGrant), JsonClaimValueTypes.Json)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.ApiSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.ApiKey,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: credentials);

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        return Ok(new LiveKitTokenResponse(jwt, _options.Url, roomName, participantName));
    }

    private static bool IsMissingConfiguration(string? apiKey, string? apiSecret, string? url)
    {
        return string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret) ||
            string.IsNullOrWhiteSpace(url) ||
            apiKey.Contains("YOUR_LIVEKIT_API_KEY", StringComparison.OrdinalIgnoreCase) ||
            apiSecret.Contains("YOUR_LIVEKIT_API_SECRET", StringComparison.OrdinalIgnoreCase) ||
            url.Contains("your-livekit-domain", StringComparison.OrdinalIgnoreCase);
    }
}
