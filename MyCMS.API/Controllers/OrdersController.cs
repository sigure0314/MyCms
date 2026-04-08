using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MyCMS.API.Data;
using MyCMS.API.DTOs;
using MyCMS.API.Hubs;
using MyCMS.API.Models;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase {
    private readonly IOrderRepository _repository;
    private readonly MenuService _menuService;
    private readonly IHubContext<OrdersHub> _hubContext;

    public OrdersController(IOrderRepository repository, MenuService menuService, IHubContext<OrdersHub> hubContext) {
        _repository = repository;
        _menuService = menuService;
        _hubContext = hubContext;
    }

    [HttpGet("menu")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<MenuItem>>> GetMenu() {
        var menu = await _menuService.GetMenuAsync();
        return Ok(menu);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrders() {
        var orders = await _repository.GetOrdersAsync();
        return Ok(orders);
    }

    [HttpPost]
    [Authorize(Policy = "Permission:api.orders.create")]
    public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var order = new Order {
            Id = Guid.NewGuid(),
            CustomerName = request.CustomerName,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            Status = "Queued",
            Items = request.Items.Select(item => new OrderItem {
                MenuItemId = item.MenuItemId,
                Name = item.Name,
                Quantity = item.Quantity,
                Price = item.Price
            }).ToList()
        };

        var created = await _repository.AddOrderAsync(order);
        await _hubContext.Clients.All.SendAsync(OrdersHubEvents.OrderQueued, created);
        return CreatedAtAction(nameof(GetOrders), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = "Permission:api.orders.update-status")]
    public async Task<ActionResult<Order>> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var updated = await _repository.UpdateOrderStatusAsync(id, request.Status);
        if (updated == null) {
            return NotFound();
        }

        await _hubContext.Clients.All.SendAsync(OrdersHubEvents.OrderStatusUpdated, new { id = updated.Id, status = updated.Status });
        return Ok(updated);
    }
}
