using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CharacterController : ControllerBase
{
    private readonly CharacterService _characterService;

    public CharacterController(CharacterService characterService)
    {
        _characterService = characterService;
    }

    [HttpGet("random")]
    public IActionResult GetRandomCharacter()
    {
        var character = _characterService.GetRandomCharacter();

        if (character == null)
        {
            return NotFound("No characters found.");
        }

        return Ok(character);
    }
}