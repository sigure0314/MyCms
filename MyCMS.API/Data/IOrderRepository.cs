using MyCMS.API.Models;

namespace MyCMS.API.Data;

public interface IOrderRepository {
    Task<List<Order>> GetOrdersAsync();
    Task<Order?> GetOrderAsync(Guid id);
    Task<Order> AddOrderAsync(Order order);
    Task<Order?> UpdateOrderStatusAsync(Guid id, string status);
}
