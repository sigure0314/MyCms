using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public sealed class GenerateImageRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "Prompt 不可為空。")]
    [StringLength(4000, MinimumLength = 1, ErrorMessage = "Prompt 長度必須介於 1 到 4000 個字元。")]
    public string? Prompt { get; init; }
}
