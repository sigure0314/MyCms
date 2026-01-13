using Microsoft.AspNetCore.Authorization;

namespace MyCMS.API.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement> {
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement
    ) {
        if (context.User?.Identity?.IsAuthenticated != true) {
            return Task.CompletedTask;
        }

        if (context.User.IsInRole("Admin")) {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var hasPermission = context.User.Claims.Any(claim =>
            claim.Type == PermissionClaimTypes.Permission &&
            string.Equals(claim.Value, requirement.Permission, StringComparison.OrdinalIgnoreCase));

        if (hasPermission) {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
