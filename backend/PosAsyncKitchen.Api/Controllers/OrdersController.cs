using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using PosAsyncKitchen.Api.Dtos;
using PosAsyncKitchen.Api.Hubs;
using PosAsyncKitchen.Api.Models;
using PosAsyncKitchen.Api.Repositories;
using PosAsyncKitchen.Api.Services;

namespace PosAsyncKitchen.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderRepository _orderRepository;
    private readonly MenuService _menuService;
    private readonly IHubContext<OrdersHub> _hubContext;

    public OrdersController(IOrderRepository orderRepository, MenuService menuService, IHubContext<OrdersHub> hubContext)
    {
        _orderRepository = orderRepository;
        _menuService = menuService;
        _hubContext = hubContext;
    }

    [HttpGet("menu")]
    public IActionResult GetMenu()
    {
        return Ok(_menuService.GetMenu());
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders(CancellationToken cancellationToken)
    {
        var orders = await _orderRepository.GetOrdersAsync(cancellationToken);
        return Ok(orders);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerName = request.CustomerName,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            Status = "Queued",
            Items = request.Items.Select(item => new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = Guid.Empty,
                MenuItemId = item.MenuItemId,
                Name = item.Name,
                Quantity = item.Quantity,
                Price = item.Price
            }).ToList()
        };

        foreach (var item in order.Items)
        {
            item.OrderId = order.Id;
        }

        var saved = await _orderRepository.AddOrderAsync(order, cancellationToken);
        await _hubContext.Clients.All.SendAsync(OrdersHub.OrderQueuedEvent, saved, cancellationToken);

        return Ok(saved);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return BadRequest("Status is required.");
        }

        var order = await _orderRepository.UpdateStatusAsync(id, status, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        await _hubContext.Clients.All.SendAsync(OrdersHub.OrderStatusUpdatedEvent, new { id, status }, cancellationToken);
        return Ok(order);
    }
}
