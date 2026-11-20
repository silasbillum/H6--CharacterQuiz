using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/lobby")]
public class LobbyController(LobbyService lobbyService) : ControllerBase
{
    [HttpPost]
    public ActionResult<LobbySnapshot> Create(LobbyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlayerName))
        {
            return BadRequest("Player name is required.");
        }

        return Ok(lobbyService.CreateLobby(request.PlayerName.Trim(),
         request.UserId));
    }

    [HttpPost("{code}/join")]
    public ActionResult<LobbySnapshot> Join(string code, LobbyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlayerName))
        {
            return BadRequest("Player name is required.");
        }

        var lobby = lobbyService.JoinLobby(
            code,
            request.PlayerName.Trim(),
            request.UserId);
            
        return lobby is null ? NotFound("Lobby not found or full.") : Ok(lobby);
    }

    [HttpGet("{code}")]
    public ActionResult<LobbySnapshot> Get(string code)
    {
        var lobby = lobbyService.GetLobby(code);
        return lobby is null ? NotFound("Lobby not found.") : Ok(lobby);
    }

    [HttpPut("{code}/players/{playerId}/ready")]
    public ActionResult<LobbySnapshot> SetReady(
        string code,
        string playerId,
        ReadyRequest request)
    {
        var lobby = lobbyService.SetReady(code, playerId, request.IsReady);
        return lobby is null ? NotFound("Lobby or player not found.") : Ok(lobby);
    }

    [HttpPut("{code}/start")]
    public ActionResult<LobbySnapshot> Start(string code, PlayerRequest request)
    {
        var lobby = lobbyService.StartGame(code, request.PlayerId);
        return lobby is null
            ? BadRequest("Only the host can start a lobby with at least two players.")
            : Ok(lobby);
    }

    [HttpPut("{code}/restart")]
    public ActionResult<LobbySnapshot> Restart(string code, PlayerRequest request)
    {
        var lobby = lobbyService.RestartGame(code, request.PlayerId);

        return lobby is null
            ? BadRequest("Only the host can restart a finished game.")
            : Ok(lobby);
    }

    [HttpPost("{code}/players/{playerId}/answer")]
    public ActionResult<LobbySnapshot> SubmitAnswer(
        string code,
        string playerId,
        AnswerRequest request)
    {
        var lobby = lobbyService.SubmitAnswer(code, playerId, request.Answer);
        return lobby is null ? NotFound("Lobby or player not found.") : Ok(lobby);
    }

    public sealed record LobbyRequest(string PlayerName, int? UserId);
    public sealed record ReadyRequest(bool IsReady);
    public sealed record PlayerRequest(string PlayerId);
    public sealed record AnswerRequest(string Answer);
}
