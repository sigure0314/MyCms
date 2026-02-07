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
[Authorize] // 確保請求有帶 Bearer Token
public class LiveKitController : ControllerBase
{
    private readonly LiveKitOptions _options;
    private readonly ILogger<LiveKitController> _logger;

    public LiveKitController(IOptions<LiveKitOptions> options, ILogger<LiveKitController> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    [HttpPost("token")]
    public ActionResult<LiveKitTokenResponse> CreateToken([FromBody] LiveKitTokenRequest request)
    {
        try
        {
            // 1. 強制檢查配置 (這是在 Render 除錯的關鍵)
            // 如果環境變數沒讀到，這會直接在 Render Logs 印出來
            if (IsMissingConfiguration(_options.ApiKey, _options.ApiSecret, _options.Url))
            {
                _logger.LogError("[LiveKit] 配置缺失或包含預設占位符。ApiKey: {KeyLen}, Url: {Url}", 
                    _options.ApiKey?.Length ?? 0, _options.Url);
                
                // 改回傳 Ok 但包含錯誤資訊，避免觸發瀏覽器的 CORS 攔截 (因為 500 常沒 CORS Header)
                return BadRequest(new { message = "伺服器 LiveKit 環境變數設定不完全。" });
            }

            var roomName = request.RoomName?.Trim();
            if (string.IsNullOrWhiteSpace(roomName))
            {
                return BadRequest(new { message = "房間名稱不可為空。" });
            }

            // 2. 獲取用戶資訊 (從您的 JWT Token 中)
            var username = User.FindFirstValue(ClaimTypes.Name) ?? 
                           User.FindFirstValue(JwtRegisteredClaimNames.UniqueName) ?? "guest";
            
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? 
                         User.FindFirstValue(JwtRegisteredClaimNames.NameId) ?? Guid.NewGuid().ToString("N");

            var participantName = string.IsNullOrWhiteSpace(request.ParticipantName)
                ? username
                : request.ParticipantName.Trim();

            // 3. 準備 LiveKit JWT 載荷
            var now = DateTime.UtcNow;
            var expires = now.AddMinutes(_options.TokenTtlMinutes <= 0 ? 30 : _options.TokenTtlMinutes);
            
            // 重要：LiveKit 的 video grant 必須是小寫屬性名的 JSON
            var videoGrant = new
            {
                room = roomName,
                roomJoin = true,
                canPublish = true,
                canSubscribe = true
            };

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Iss, _options.ApiKey!),
                new(JwtRegisteredClaimNames.Sub, userId),
                new(JwtRegisteredClaimNames.Name, participantName),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new("video", JsonSerializer.Serialize(videoGrant), JsonClaimValueTypes.Json)
            };

            // 4. 簽署 Token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.ApiSecret!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _options.ApiKey,
                claims: claims,
                notBefore: now,
                expires: expires,
                signingCredentials: credentials);

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            _logger.LogInformation("[LiveKit] Token 生成成功: Room={Room}, User={User}", roomName, participantName);

            return Ok(new LiveKitTokenResponse(jwt, _options.Url!, roomName, participantName));
        }
        catch (Exception ex)
        {
            // 捕捉所有意外錯誤並記錄到 Render Logs
            _logger.LogCritical(ex, "[LiveKit] 生成 Token 時發生嚴重崩潰");
            return StatusCode(500, new { message = "伺服器內部錯誤", details = ex.Message });
        }
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
