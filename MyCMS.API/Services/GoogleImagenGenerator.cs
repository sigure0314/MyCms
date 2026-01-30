using System.Text;
using System.Text.Json;

namespace MyCMS.API.Services;

public class GoogleImagenGenerator : IImageGenerator
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string ModelId = "imagen-3.0-generate-001"; // Google 最新繪圖模型
    private const string DefaultStyleSuffix = ", children book illustration style, high quality, colorful";

    public GoogleImagenGenerator(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"]; // 共用同一個 Key
    }

   public async Task<byte[]> GenerateImageAsync(string prompt)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:predict?key={_apiKey}";

        // 1. 先嘗試最簡單的 Payload
        var requestBody = new
        {
            instances = new[] { 
                new { prompt = prompt + DefaultStyleSuffix } 
            },
            parameters = new { aspectRatio = "1:1" } // 只留比例
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        var response = await _httpClient.PostAsync(url, 
            new StringContent(JsonSerializer.Serialize(requestBody, jsonOptions), Encoding.UTF8, "application/json"));

        // ✨ 修改這裡：詳細捕捉錯誤訊息
        if (!response.IsSuccessStatusCode)
        {
            var errorDetail = await response.Content.ReadAsStringAsync();
            // 這行會把 Google 的錯誤 JSON 噴在你的 Terminal 或 Postman 裡
            throw new Exception($"Imagen API 請求失敗: {response.StatusCode}. 詳細內容: {errorDetail}");
        }

        var jsonString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonString);
        
        // 注意：Imagen 3/4 的回傳結構可能變了，如果這邊爆錯，我們再看 JSON 解
        if (doc.RootElement.TryGetProperty("predictions", out var predictions) && predictions.GetArrayLength() > 0)
        {
            var move = predictions[0];
            if (move.TryGetProperty("bytesBase64Encoded", out var bytesElement))
            {
                 var base64 = bytesElement.GetString();
                 return Convert.FromBase64String(base64 ?? string.Empty);
            }
             // 有時候結構可能是 mimeType + bytesBase64Encoded
             throw new Exception($"找不到 bytesBase64Encoded 欄位. JSON: {jsonString}");
        }

        // 如果找不到 predictions，可能是 error 在 body 裡面但 status code 是 200 (比較少見但預防萬一)
        throw new Exception($"回傳 JSON 結構不符預期. JSON: {jsonString}");
    }
}
