using System.Diagnostics;

namespace MyCMS.API.Middleware;

public class HttpMutationLoggingMiddleware(RequestDelegate next, ILogger<HttpMutationLoggingMiddleware> logger)
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

        logger.LogInformation(
            "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds} ms (User: {User}, IP: {RemoteIp})",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            stopwatch.ElapsedMilliseconds,
            userName,
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown");
    }
}
