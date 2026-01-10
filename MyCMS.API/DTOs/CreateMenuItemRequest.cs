using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public class CreateMenuItemRequest {
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;
}
