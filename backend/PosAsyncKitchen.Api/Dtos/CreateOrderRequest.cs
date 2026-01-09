using System.ComponentModel.DataAnnotations;

namespace PosAsyncKitchen.Api.Dtos;

public class CreateOrderRequest
{
    [Required]
    public string CustomerName { get; set; } = string.Empty;

    public string? Notes { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateOrderItem> Items { get; set; } = new();
}

public class CreateOrderItem
{
    public string MenuItemId { get; set; } = string.Empty;

    [Required]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }
}
