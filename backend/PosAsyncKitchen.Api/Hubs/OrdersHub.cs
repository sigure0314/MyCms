using Microsoft.AspNetCore.SignalR;

namespace PosAsyncKitchen.Api.Hubs;

public class OrdersHub : Hub
{
    public const string OrderQueuedEvent = "OrderQueued";
    public const string OrderStatusUpdatedEvent = "OrderStatusUpdated";
}
