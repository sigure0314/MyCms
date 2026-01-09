using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.Models;

public class Order {
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string CustomerName { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    [Required]
    public string Status { get; set; } = string.Empty;

    public List<OrderItem> Items { get; set; } = new();
}
