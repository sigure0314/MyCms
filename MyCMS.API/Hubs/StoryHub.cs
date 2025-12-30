using Microsoft.AspNetCore.SignalR;

namespace MyCMS.API.Hubs;

public class StoryHub : Hub
{
  // 參數從 bookId 改成 roomId (這個 roomId 可以是任何字串)
    public async Task JoinGroup(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
    }

    // 翻頁時，只通知同一個房間的人
    public async Task SyncPage(string roomId, int pageIndex)
    {
        await Clients.Group(roomId).SendAsync("ReceivePageUpdate", pageIndex);
    }
}