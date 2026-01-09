using PosAsyncKitchen.Api.Models;

namespace PosAsyncKitchen.Api.Services;

public class MenuService
{
    private readonly List<MenuItem> _menu = new()
    {
        new MenuItem
        {
            Id = "classic-burger",
            Name = "Classic Burger",
            Description = "Beef patty, cheddar, lettuce, tomato.",
            Price = 7.99m,
            Category = "Main"
        },
        new MenuItem
        {
            Id = "veggie-bowl",
            Name = "Veggie Bowl",
            Description = "Quinoa, seasonal veggies, and house sauce.",
            Price = 6.5m,
            Category = "Main"
        },
        new MenuItem
        {
            Id = "sweet-potato-fries",
            Name = "Sweet Potato Fries",
            Description = "Crispy fries with smoked paprika salt.",
            Price = 3.75m,
            Category = "Side"
        },
        new MenuItem
        {
            Id = "iced-lemon-tea",
            Name = "Iced Lemon Tea",
            Description = "Fresh lemon with lightly sweetened tea.",
            Price = 2.5m,
            Category = "Drink"
        }
    };

    public IReadOnlyList<MenuItem> GetMenu() => _menu;
}
