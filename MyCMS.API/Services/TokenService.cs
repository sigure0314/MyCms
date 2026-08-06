using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MyCMS.API.Authorization;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class TokenService {
    private readonly IConfiguration _config;
    public TokenService(IConfiguration config) => _config = config;

    public string CreateToken(User user, IEnumerable<string> permissions) {
        return CreateToken(user.Id.ToString(), user.Username, user.Role.Name, permissions);
    }

    public string CreateToken(string subject, string username, string role, IEnumerable<string> permissions) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.NameId, subject),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(ClaimTypes.Role, role)
        };
        foreach (var permission in permissions.Distinct(StringComparer.OrdinalIgnoreCase)) {
            claims.Add(new Claim(PermissionClaimTypes.Permission, permission));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(1),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
