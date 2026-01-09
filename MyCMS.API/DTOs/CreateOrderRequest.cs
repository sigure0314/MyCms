using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public class CreateOrderRequest {
    [Required]
    public string CustomerName { get; set; } = string.Empty;

    public string? Notes { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateOrderItem> Items { get; set; } = new();
}
