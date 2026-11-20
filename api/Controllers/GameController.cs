using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GameController(GameService gameService) : ControllerBase
{

    
    [HttpPost("save")]
    public async Task<IActionResult> SaveGame(SaveGameRequest request)
    {
        if (request.Points < 0 || request.Streak < 0 || request.BestStreak < 0 || request.CorrectGuesses < 0)
        {
            return BadRequest("Game statistics cannot be negative.");
        }

        if (request.EndedAt <= request.StartedAt)
        {
            return BadRequest("Game end time must be after the start time.");
        }

        var result = await gameService.SaveGameAsync(request);
        return result is null
        ? BadRequest("Failed to save game. User may not exist.")
        : Ok(new
        {
            result.Id,
            result.GameId,
            result.UserId,
            result.Points,
            result.Streak,
            result.BestStreak,
            result.CorrectGuesses,
            result.Placement,
        });
    }

    [HttpPost("save-multiplayer")]
    public async Task<IActionResult> SaveMultiplayerGame(SaveMultiplayerGameRequest request)
    {
        if (request.Players.Count is < 2 or > 4)
        {
            return BadRequest("Multiplayer games must have between 2 and 4 players.");
        }

        if (request.EndedAt <= request.StartedAt)
        {
            return BadRequest("Game end time must be after the start time.");
        }

        if (request.Players.Any(player =>
            player.Points < 0 ||
            player.Streak < 0 ||
            player.BestStreak < 0 ||
            player.CorrectGuesses < 0 ||
            player.Placement < 1 ||
            player.Placement > request.Players.Count))
        {
            return BadRequest("Game statistics cannot be negative."); 
        }

        var gameId = await gameService.SaveMultiplayerGameAsync(request);
        return gameId is null
        ? BadRequest("Failed to save multiplayer game. One or more users may not exist.")
        : Ok(new { GameId = gameId });
    }

        [HttpPost("character-answer")]
            public async Task<IActionResult> RecordCharacterAnswer(
                CharacterAnswerRequest request)
            {
                if (request.CharacterId <= 0 ||
                    string.IsNullOrWhiteSpace(request.CharacterName) ||
                    string.IsNullOrWhiteSpace(request.ShowName))
                {
                    return BadRequest("Character information is invalid.");
                }

                await gameService.RecordCharacterAnswerAsync(request);

                return Ok();
            }

    
}