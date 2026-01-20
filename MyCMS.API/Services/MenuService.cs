using Microsoft.EntityFrameworkCore;
using MyCMS.API.Data;
using MyCMS.API.Models;

namespace MyCMS.API.Services;

public class MenuService {
    private readonly KitchenDbContext _context;

    public MenuService(KitchenDbContext context) {
        _context = context;
    }

    public async Task<List<MenuItem>> GetMenuAsync() {
        return await _context.MenuItems
            .OrderBy(item => item.Id)
            .ToListAsync();
    }

    public async Task<MenuItem> AddMenuItemAsync(string name, string description, decimal price, string category) {
        var item = new MenuItem {
            Name = name,
            Description = description,
            Price = price,
            Category = category
        };
        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }

    public async Task<MenuItem?> UpdateMenuItemAsync(int id, string name, string description, decimal price, string category) {
        var item = await _context.MenuItems.FirstOrDefaultAsync(menuItem => menuItem.Id == id);
        if (item == null) {
            return null;
        }

        item.Name = name;
        item.Description = description;
        item.Price = price;
        item.Category = category;

        await _context.SaveChangesAsync();
        return item;
    }

    public async Task<bool> DeleteMenuItemAsync(int id) {
        var item = await _context.MenuItems.FirstOrDefaultAsync(menuItem => menuItem.Id == id);
        if (item == null) {
            return false;
        }

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }
}
