using Microsoft.AspNetCore.SignalR;

namespace MyCMS.API.Hubs;

public class OrdersHub : Hub {
}

public static class OrdersHubEvents {
    public const string OrderQueued = "OrderQueued";
    public const string OrderStatusUpdated = "OrderStatusUpdated";
}
