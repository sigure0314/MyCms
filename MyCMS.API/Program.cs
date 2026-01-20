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

// 5. CORS (Allow Frontend)
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(opt => opt.AddPolicy("AllowConfiguredOrigins", policy =>
    policy.SetIsOriginAllowed(origin =>
        {
            // 明確允許清單
            if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                return true;

            // 允許所有 Vercel 站台（含 Preview）
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
