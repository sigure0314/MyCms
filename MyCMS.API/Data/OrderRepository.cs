using Microsoft.EntityFrameworkCore;
using MyCMS.API.Models;

namespace MyCMS.API.Data;

public class OrderRepository : IOrderRepository {
    private readonly KitchenDbContext _context;

    public OrderRepository(KitchenDbContext context) {
        _context = context;
    }

    public async Task<List<Order>> GetOrdersAsync() {
        return await _context.Orders
            .Include(o => o.Items)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<Order?> GetOrderAsync(Guid id) {
        return await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<Order> AddOrderAsync(Order order) {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        return order;
    }

    public async Task<Order?> UpdateOrderStatusAsync(Guid id, string status) {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) {
            return null;
        }

        order.Status = status;
        await _context.SaveChangesAsync();
        return order;
    }
}
