using System.Text;
using System.Text.Json;

namespace MyCMS.API.Services;

public class GoogleImagenGenerator : IImageGenerator
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string ModelId = "imagen-4.0-fast-generate-001"; // Google 最新繪圖模型

    public GoogleImagenGenerator(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"]; // 共用同一個 Key
    }

   public async Task<byte[]> GenerateImageAsync(string prompt)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:predict?key={_apiKey}";

        // 1. 先嘗試最簡單的 Payload (去掉 sampleCount，有時候新模型不支援這個參數)
        var requestBody = new
        {
            instances = new[] { 
                new { prompt = prompt + ", children book illustration style, high quality, colorful" } 
            },
            parameters = new { aspectRatio = "1:1" } // 只留比例
        };

        var response = await _httpClient.PostAsync(url, 
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

        // ✨ 修改這裡：詳細捕捉錯誤訊息
        if (!response.IsSuccessStatusCode)
        {
            var errorDetail = await response.Content.ReadAsStringAsync();
            // 這行會把 Google 的錯誤 JSON 噴在你的 Terminal 或 Postman 裡
            throw new Exception($"Imagen API 請求失敗: {response.StatusCode}. 詳細內容: {errorDetail}");
        }

        var jsonString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonString);
        
        // 注意：Imagen 4 的回傳結構可能變了，如果這邊爆錯，我們再看 JSON 解
        var predictions = doc.RootElement.GetProperty("predictions");
        var base64 = predictions[0].GetProperty("bytesBase64Encoded").GetString();
        
        return Convert.FromBase64String(base64);
    }
}