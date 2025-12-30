namespace MyCMS.API.Services;

// 負責文字 (Gemini)
public interface IGeminiClient
{
    Task<string> GenerateStoryJsonAsync(string topic);
    // ✨ 建議新增這個通用方法，讓 Service 可以傳入複雜的 Prompt
    Task<string> GenerateTextAsync(string prompt);
}

// 負責圖片 (Imagen)
public interface IImageGenerator
{
    Task<byte[]> GenerateImageAsync(string prompt);
}