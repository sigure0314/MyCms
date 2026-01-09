using Microsoft.EntityFrameworkCore;
using PosAsyncKitchen.Api.Data;
using PosAsyncKitchen.Api.Hubs;
using PosAsyncKitchen.Api.Repositories;
using PosAsyncKitchen.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("PosAsyncKitchen");

builder.Services.AddDbContext<KitchenDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseInMemoryDatabase("PosAsyncKitchen");
    }
});

builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddSingleton<MenuService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();

        if (origins.Length == 0)
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(origins).AllowCredentials();
        }

        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
});

builder.Services.AddSignalR();
builder.Services.AddControllers();

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowedOrigins");

app.MapControllers();
app.MapHub<OrdersHub>("/hubs/orders");

app.Run();
