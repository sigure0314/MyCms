using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyCMS.API.Authorization;
using MyCMS.API.Data;
using MyCMS.API.Services;
using MyCMS.API.Hubs ;

var builder = WebApplication.CreateBuilder(args);
var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseKey = builder.Configuration["Supabase:Key"];
if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
{
    throw new Exception("Supabase Url 或 Key 未設定！請檢查 appsettings.json");
}
builder.Services.AddSignalR();
// 1. DB Connection
// 使用 UseNpgsql 來連線到 Supabase
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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        ValidateIssuer = true, ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = builder.Configuration["Jwt:Audience"]
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// 5. CORS (合併本地與雲端設定)
// 讀取 appsettings.json 的陣列
var fromJson = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

// 讀取 Render 的環境變數字串 (用大寫底線區隔)
var fromEnv = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();

// 合併並清理網址格式
var allowedOrigins = fromJson.Concat(fromEnv)
                    .Select(o => o.Trim().TrimEnd('/'))
                    .Distinct()
                    .ToArray();

// 這行一定要加！這樣你在 Render Logs 才能百分之百確認變數有沒有讀到
Console.WriteLine($"[CORS INFO] 啟用的白名單網域: {string.Join(", ", allowedOrigins)}");

builder.Services.AddCors(opt => opt.AddPolicy("AllowConfiguredOrigins", policy =>
    policy.SetIsOriginAllowed(origin =>
    {
        var cleanOrigin = origin.TrimEnd('/');
        
        // 1. 檢查合併後的名單 (包含你的新網域 sigurelee.idv.tw)
        if (allowedOrigins.Any(o => o.Equals(cleanOrigin, StringComparison.OrdinalIgnoreCase)))
            return true;

        // 2. 依然保留對所有 Vercel 預覽網址的支援
        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);

        return false;
    })
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials()));
builder.Services.AddHttpClient<IGeminiClient, GeminiClient>();
builder.Services.AddHttpClient<IImageGenerator, GoogleImagenGenerator>();
builder.Services.Configure<InstagramGraphApiOptions>(
    builder.Configuration.GetSection("InstagramGraphApi"));
builder.Services.AddHttpClient<InstagramGraphApiService>();
builder.Services.AddScoped<StoryService>();
builder.Services.Configure<RedisOptions>(builder.Configuration.GetSection("Redis"));
builder.Services.AddSingleton<IOnlineUserTracker, OnlineUserTracker>();
builder.Services.Configure<LiveKitOptions>(builder.Configuration.GetSection("LiveKit"));

var app = builder.Build();

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

using (var scope = app.Services.CreateScope()) {
    var kitchenDb = scope.ServiceProvider.GetRequiredService<KitchenDbContext>();
    if (kitchenDb.Database.IsRelational()) {
        kitchenDb.Database.Migrate();
    }
}

//app.UseCors("AllowReact");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowConfiguredOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<StoryHub>("/storyHub");
app.MapHub<OrdersHub>("/hubs/orders");
app.MapFallbackToFile("index.html");
app.Run();
