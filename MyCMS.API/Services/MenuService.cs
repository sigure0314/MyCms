using MyCMS.API.Models;

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

    public IReadOnlyList<MenuItem> GetMenu() => _menu;
}
