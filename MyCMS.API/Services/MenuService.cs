using MyCMS.API.Models;
using System.Linq;

namespace MyCMS.API.Services;

public class MenuService {
    private readonly List<MenuItem> _menu = new() {
        new MenuItem {
            Id = 1,
            Name = "Classic Burger",
            Description = "Juicy beef patty with cheddar, lettuce, and tomato.",
            Price = 8.5m,
            Category = "Main"
        },
        new MenuItem {
            Id = 2,
            Name = "Veggie Bowl",
            Description = "Quinoa, roasted veggies, and herb dressing.",
            Price = 7.2m,
            Category = "Main"
        },
        new MenuItem {
            Id = 3,
            Name = "Sweet Potato Fries",
            Description = "Crispy fries with smoky paprika salt.",
            Price = 3.8m,
            Category = "Side"
        },
        new MenuItem {
            Id = 4,
            Name = "Iced Lemon Tea",
            Description = "Fresh lemon brewed tea with ice.",
            Price = 2.5m,
            Category = "Drink"
        }
    };

    private int _nextId;

    public MenuService() {
        _nextId = _menu.Count == 0 ? 1 : _menu.Max(item => item.Id) + 1;
    }

    public IReadOnlyList<MenuItem> GetMenu() => _menu;

    public MenuItem AddMenuItem(string name, string description, decimal price, string category) {
        var item = new MenuItem {
            Id = _nextId++,
            Name = name,
            Description = description,
            Price = price,
            Category = category
        };
        _menu.Add(item);
        return item;
    }

    public MenuItem? UpdateMenuItem(int id, string name, string description, decimal price, string category) {
        var item = _menu.FirstOrDefault(menuItem => menuItem.Id == id);
        if (item == null) {
            return null;
        }

        item.Name = name;
        item.Description = description;
        item.Price = price;
        item.Category = category;

        return item;
    }

    public bool DeleteMenuItem(int id) {
        var item = _menu.FirstOrDefault(menuItem => menuItem.Id == id);
        if (item == null) {
            return false;
        }

        _menu.Remove(item);
        return true;
    }
}
