using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyCMS.API.Authorization;
using MyCMS.API.Data;
using MyCMS.API.Hubs;
using MyCMS.API.Middleware;
using MyCMS.API.Services;
using Serilog;

// --- 徹底修正 inotify 限制的終極方案 ---
// 在所有初始化之前，強制關閉全域配置監控
Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "false");
Environment.SetEnvironmentVariable("ASPNETCORE_hostBuilder__reloadConfigOnChange", "false");

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = Directory.GetCurrentDirectory()
});

// 手動清除預設來源，改用不監控變更的方式載入
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();
// --- 修正結束 ---

builder.Host.UseSerilog((context, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console();

    var sourceToken = context.Configuration["BetterStack:SourceToken"];
    if (!string.IsNullOrWhiteSpace(sourceToken))
    {
        loggerConfiguration.WriteTo.BetterStack(sourceToken);

        var sourceId = context.Configuration["BetterStack:SourceId"];
        if (!string.IsNullOrWhiteSpace(sourceId))
        {
            loggerConfiguration.Enrich.WithProperty("BetterStackSourceId", sourceId);
        }
    }
});

var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseKey = builder.Configuration["Supabase:Key"];

if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
{
    throw new Exception("Supabase Url 或 Key 未設定！請檢查配置。");
}

builder.Services.AddSignalR();

// 1. DB Connection
builder.Services.AddDbContext<AppDbContext>(opt => 
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var kitchenConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(kitchenConnectionString)) {
    builder.Services.AddDbContext<KitchenDbContext>(opt =>
        opt.UseInMemoryDatabase("PosAsyncKitchen"));
} else {
    builder.Services.AddDbContext<KitchenDbContext>(opt =>
        opt.UseNpgsql(kitchenConnectionString));
}

var hangfireConnectionString = kitchenConnectionString ?? throw new InvalidOperationException("DefaultConnection 未設定，無法啟用 Hangfire。");

builder.Services.AddHangfire(config =>
{
    config.UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(hangfireConnectionString));
});
builder.Services.AddHangfireServer();

builder.Services.AddScoped<Supabase.Client>(_ => 
    new Supabase.Client(supabaseUrl, supabaseKey, new Supabase.SupabaseOptions
    {
        AutoRefreshToken = true,
        AutoConnectRealtime = true
    }));

// 2. Services DI
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<MenuService>();
builder.Services.AddSingleton<FramePlaylistService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 3. Swagger with JWT Support
builder.Services.AddSwaggerGen(c => {
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Name = "Authorization", Type = SecuritySchemeType.ApiKey, Scheme = "Bearer", In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, new string[] {} }
    });
});

// 4. JWT Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(opt => {
    opt.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "default_secret_key_long_enough")),
        ValidateIssuer = true, ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = builder.Configuration["Jwt:Audience"]
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// 5. CORS
var fromJson = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var fromEnv = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
var allowedOrigins = fromJson.Concat(fromEnv)
                    .Select(o => o.Trim().TrimEnd('/'))
                    .Distinct()
                    .ToArray();

Console.WriteLine($"[CORS INFO] 啟用的白名單網域: {string.Join(", ", allowedOrigins)}");

builder.Services.AddCors(opt => opt.AddPolicy("AllowConfiguredOrigins", policy =>
    policy.SetIsOriginAllowed(origin =>
    {
        var cleanOrigin = origin.TrimEnd('/');
        if (allowedOrigins.Any(o => o.Equals(cleanOrigin, StringComparison.OrdinalIgnoreCase)))
            return true;
        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
        return false;
    })
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials()));

builder.Services.AddHttpClient<IGeminiClient, GeminiClient>();
builder.Services.AddHttpClient<IImageGenerator, GoogleImagenGenerator>();
builder.Services.Configure<InstagramGraphApiOptions>(builder.Configuration.GetSection("InstagramGraphApi"));
builder.Services.AddHttpClient<InstagramGraphApiService>();
builder.Services.AddScoped<InstagramPublishJobService>();
builder.Services.Configure<InstagramPublishOptions>(builder.Configuration.GetSection("InstagramPublish"));
builder.Services.AddScoped<StoryService>();
builder.Services.AddHttpClient<IStockDataService, StockDataService>();
builder.Services.Configure<RedisOptions>(builder.Configuration.GetSection("Redis"));
builder.Services.AddSingleton<IOnlineUserTracker, OnlineUserTracker>();
builder.Services.Configure<LiveKitOptions>(builder.Configuration.GetSection("LiveKit"));

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

using (var scope = app.Services.CreateScope()) {
    var kitchenDb = scope.ServiceProvider.GetRequiredService<KitchenDbContext>();
    if (kitchenDb.Database.IsRelational()) {
        kitchenDb.Database.Migrate();
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowConfiguredOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<HttpMutationLoggingMiddleware>();
app.UseHangfireDashboard("/hangfire");
app.MapControllers();
app.MapGet("/api/ping", () => Results.Ok("pong"));
app.MapHub<StoryHub>("/storyHub");
app.MapHub<OrdersHub>("/hubs/orders");
app.MapFallbackToFile("index.html");
app.Run();
