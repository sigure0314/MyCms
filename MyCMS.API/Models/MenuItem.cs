using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.Models;

public class MenuItem {
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;
}
