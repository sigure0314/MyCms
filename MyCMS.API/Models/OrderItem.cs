using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MyCMS.API.Models;

public class OrderItem {
    public int Id { get; set; }

    public Guid OrderId { get; set; }

    [JsonIgnore]
    public Order? Order { get; set; }

    public int MenuItemId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }
}
