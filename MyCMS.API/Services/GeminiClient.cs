using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MyCMS.API.Services;

public class GeminiClient : IGeminiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string ModelId = "gemini-2.5-flash"; // 便宜又快

    public GeminiClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"]; // 從 User Secrets 讀取
    }

    public async Task<string> GenerateStoryJsonAsync(string topic)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:generateContent?key={_apiKey}";

        // 精心調教的 Prompt
        var prompt = $@"
        你是一位童書作家。請為主題「{topic}」創作一個 4 頁的故事。
        請嚴格遵守以下 JSON 格式回傳，不要包含 markdown 標記：
        [
          {{ ""PageIndex"": 1, ""Content"": ""故事文字"", ""ImagePrompt"": ""英文繪圖指令"" }}
        ]";

        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { responseMimeType = "application/json" } // ✨ 強制 JSON
        };

        var response = await _httpClient.PostAsync(url, 
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));
            
        response.EnsureSuccessStatusCode();

        var jsonString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonString);
        
        // 取出生成的文字
        return doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
    }

public async Task<string> GenerateTextAsync(string prompt)
    {
        // 1. 設定 Gemini API 網址 (使用 flash 模型比較快)
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:generateContent?key={_apiKey}";

        // 2. 組裝請求內容
        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            }
        };

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        // 3. 發送請求
        var response = await _httpClient.PostAsync(url, jsonContent);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorMsg = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Gemini API Error: {response.StatusCode}, Detail: {errorMsg}");
        }

        var responseString = await response.Content.ReadAsStringAsync();

        // 4. 解析回傳結果 (Gemini 的 JSON 結構比較深)
        using var doc = JsonDocument.Parse(responseString);
        
        // 嘗試取得回應文字
        try 
        {
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? string.Empty;
        }
        catch
        {
            // 如果解析失敗，印出原始回應方便除錯
            throw new Exception($"無法解析 Gemini 回應: {responseString}");
        }
    }
}