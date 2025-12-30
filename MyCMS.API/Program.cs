using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyCMS.API.Data;
using MyCMS.API.Services;
using MyCMS.API.Hubs ;

var builder = WebApplication.CreateBuilder(args);
var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseKey = builder.Configuration["Supabase:Key"];
builder.Services.AddSignalR();
// 1. DB Connection
// 使用 UseNpgsql 來連線到 Supabase
builder.Services.AddDbContext<AppDbContext>(opt => 
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<Supabase.Client>(_ => 
    new Supabase.Client(supabaseUrl, supabaseKey, new Supabase.SupabaseOptions
    {
        AutoRefreshToken = true,
        AutoConnectRealtime = true
    }));
// 2. Services DI
builder.Services.AddScoped<TokenService>();
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

// 5. CORS (Allow Frontend)
//builder.Services.AddCors(opt => opt.AddPolicy("AllowReact", policy => 
  //  policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader()));
builder.Services.AddCors(opt => opt.AddPolicy("AllowAll", policy => 
 policy.SetIsOriginAllowed(_ => true) // 允許 Codespaces 前端網址
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

//app.UseCors("AllowReact");
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<StoryHub>("/storyHub");
app.Run();
