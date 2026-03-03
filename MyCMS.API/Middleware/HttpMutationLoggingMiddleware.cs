using System.Diagnostics;
using Serilog;

namespace MyCMS.API.Middleware;

public class HttpMutationLoggingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method) && !HttpMethods.IsDelete(context.Request.Method))
        {
            await next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        await next(context);
        stopwatch.Stop();

        var userName = context.User?.Identity?.IsAuthenticated == true
            ? context.User.Identity?.Name ?? "(authenticated)"
            : "anonymous";

        Log.ForContext("HttpMethod", context.Request.Method)
            .ForContext("RequestPath", context.Request.Path.ToString())
            .ForContext("StatusCode", context.Response.StatusCode)
            .ForContext("ElapsedMilliseconds", stopwatch.ElapsedMilliseconds)
            .ForContext("User", userName)
            .ForContext("RemoteIp", context.Connection.RemoteIpAddress?.ToString() ?? "unknown")
            .Information("HTTP mutation request completed");
    }
}
