using Microsoft.EntityFrameworkCore;
using PosAsyncKitchen.Api.Data;
using PosAsyncKitchen.Api.Models;

namespace PosAsyncKitchen.Api.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly KitchenDbContext _dbContext;

    public OrderRepository(KitchenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<Order>> GetOrdersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Orders
            .Include(order => order.Items)
            .OrderBy(order => order.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Order> AddOrderAsync(Order order, CancellationToken cancellationToken = default)
    {
        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return order;
    }

    public async Task<Order?> UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (order is null)
        {
            return null;
        }

        order.Status = status;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return order;
    }
}
