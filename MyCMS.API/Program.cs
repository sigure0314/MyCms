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
        if (kitchenDb.Database.IsNpgsql()) {
            EnsureKitchenMigrationHistory(kitchenDb);
        }
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

static void EnsureKitchenMigrationHistory(KitchenDbContext kitchenDb) {
    const string initialMigrationId = "20250313000000_InitialKitchenSchema";
    const string productVersion = "9.0.0";

    var connection = kitchenDb.Database.GetDbConnection();
    connection.Open();
    try {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = '__EFMigrationsHistory'
            );
            """;
        var historyExists = (bool)command.ExecuteScalar()!;

        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'Orders'
            );
            """;
        var ordersExists = (bool)command.ExecuteScalar()!;

        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'MenuItems'
            );
            """;
        var menuItemsExists = (bool)command.ExecuteScalar()!;

        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'OrderItems'
            );
            """;
        var orderItemsExists = (bool)command.ExecuteScalar()!;

        if (ordersExists) {
            if (!menuItemsExists) {
                command.CommandText = """
                    CREATE TABLE IF NOT EXISTS "MenuItems" (
                        "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        "Name" text NOT NULL,
                        "Description" text NOT NULL,
                        "Price" numeric NOT NULL,
                        "Category" text NOT NULL
                    );
                    """;
                command.ExecuteNonQuery();
                menuItemsExists = true;
            }

            if (!orderItemsExists) {
                command.CommandText = """
                    CREATE TABLE IF NOT EXISTS "OrderItems" (
                        "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        "OrderId" uuid NOT NULL,
                        "MenuItemId" integer NOT NULL,
                        "Name" text NOT NULL,
                        "Quantity" integer NOT NULL,
                        "Price" numeric NOT NULL,
                        CONSTRAINT "FK_OrderItems_Orders_OrderId"
                            FOREIGN KEY ("OrderId")
                            REFERENCES "Orders" ("Id")
                            ON DELETE CASCADE
                    );
                    """;
                command.ExecuteNonQuery();

                command.CommandText = """
                    CREATE INDEX IF NOT EXISTS "IX_OrderItems_OrderId"
                    ON "OrderItems" ("OrderId");
                    """;
                command.ExecuteNonQuery();
                orderItemsExists = true;
            }
            if (!historyExists) {
                command.CommandText = """
                    CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                        "MigrationId" character varying(150) NOT NULL,
                        "ProductVersion" character varying(32) NOT NULL,
                        CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
                    );
                    """;
                command.ExecuteNonQuery();
                historyExists = true;
            }

            var migrationApplied = false;
            if (historyExists) {
                command.CommandText = """
                    SELECT EXISTS (
                        SELECT 1
                        FROM "__EFMigrationsHistory"
                        WHERE "MigrationId" = @migrationId
                    );
                    """;
                command.Parameters.Clear();
                var migrationIdParam = command.CreateParameter();
                migrationIdParam.ParameterName = "migrationId";
                migrationIdParam.Value = initialMigrationId;
                command.Parameters.Add(migrationIdParam);
                migrationApplied = (bool)command.ExecuteScalar()!;
            }

            if (!migrationApplied && menuItemsExists && orderItemsExists) {
                command.CommandText = """
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES (@migrationId, @productVersion)
                    ON CONFLICT ("MigrationId") DO NOTHING;
                    """;
                command.Parameters.Clear();
                var migrationIdParam = command.CreateParameter();
                migrationIdParam.ParameterName = "migrationId";
                migrationIdParam.Value = initialMigrationId;
                command.Parameters.Add(migrationIdParam);

                var productVersionParam = command.CreateParameter();
                productVersionParam.ParameterName = "productVersion";
                productVersionParam.Value = productVersion;
                command.Parameters.Add(productVersionParam);

                command.ExecuteNonQuery();
            }
        }
    } finally {
        connection.Close();
    }
}
