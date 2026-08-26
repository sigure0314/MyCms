namespace MyCMS.API.Services;

public sealed class CloudflareImageGenerationOptions
{
    public string? ApiToken { get; set; }
    public string? AccountId { get; set; }
    public string? Model { get; set; }
}
