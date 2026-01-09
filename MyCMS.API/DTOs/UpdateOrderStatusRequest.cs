using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public class UpdateOrderStatusRequest {
    [Required]
    public string Status { get; set; } = string.Empty;
}
