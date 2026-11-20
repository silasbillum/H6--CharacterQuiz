using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
// CharacterController exposes the two operations used by both game modes:
// selecting a question and finding answer suggestions.
public class CharacterController(
    CharacterService characterService,
    GameService gameService) : ControllerBase

{
    

    [HttpGet("random")]
    public async Task<IActionResult> GetRandomCharacter(
        [FromQuery] string difficulty = "Normal")
    {
        var allowedDifficulties = new[] { "Easy", "Normal", "Hard" };

        if (!allowedDifficulties.Contains(difficulty))
        {
            return BadRequest(
                "Difficulty must be Easy, Normal, or Hard.");
        }

        var character = await gameService
            .GetRandomCharacterAsync(difficulty);

        if (character is null)
        {
            return NotFound("No characters found.");
        }

        return Ok(character);
    }

    [HttpGet("search")]
    public IActionResult SearchCharacters([FromQuery] string query)
    {
        // Empty searches return an empty list rather than loading the full
        // character dataset for a request that cannot produce useful results.
        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(Array.Empty<Character>());
        }

        return Ok(characterService.SearchCharacters(query.Trim()));
    }
}