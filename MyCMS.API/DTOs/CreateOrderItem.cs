using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public class CreateOrderItem {
    [Required]
    public int MenuItemId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }
}
