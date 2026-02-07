using System.ComponentModel.DataAnnotations;

namespace MyCMS.API.DTOs;

public record LiveKitTokenRequest(
    [Required(ErrorMessage = "請提供房間名稱。")] string RoomName,
    string? ParticipantName
);

public record LiveKitTokenResponse(
    string Token,
    string ServerUrl,
    string RoomName,
    string ParticipantName
);
