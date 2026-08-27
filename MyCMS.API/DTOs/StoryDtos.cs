using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

// 1. [前端 -> 後端] 請求生成草稿 (Step 1)
public class GenerateScriptRequest
{
    public string Topic { get; set; } = string.Empty;

    [Range(2, 15, ErrorMessage = "童書頁數必須介於 2 到 15 頁。")]
    public int Pages { get; set; } = 4;
    public string Age { get; set; } = "5";
}

// 2. [後端 -> 前端] 回傳草稿內容給使用者修潤 (Step 1 Response)
public class StoryDraftDto
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public List<StoryPageDto> Pages { get; set; } = new();
}

// 每一頁的結構 (共用)
public class StoryPageDto
{
    public int PageIndex { get; set; }
    public string Content { get; set; } = string.Empty;     // 故事文字
    public string ImagePrompt { get; set; } = string.Empty; // AI 繪圖提示詞
}

// 3. [前端 -> 後端] 請求定稿並畫圖 (Step 2)
// 這時候傳回來的資料，可能是使用者修潤過的
public class FinalizeStoryRequest
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    [MinLength(2, ErrorMessage = "童書至少需要 2 頁。")]
    [MaxLength(15, ErrorMessage = "童書最多只能有 15 頁。")]
    public List<StoryPageDto> Pages { get; set; } = new();
}
