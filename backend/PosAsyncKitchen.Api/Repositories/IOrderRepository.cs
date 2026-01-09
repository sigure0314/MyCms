using PosAsyncKitchen.Api.Models;

namespace PosAsyncKitchen.Api.Repositories;

public interface IOrderRepository
{
    Task<List<Order>> GetOrdersAsync(CancellationToken cancellationToken = default);
    Task<Order> AddOrderAsync(Order order, CancellationToken cancellationToken = default);
    Task<Order?> UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken = default);
}
