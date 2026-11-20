using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController(GameService gameService) : ControllerBase
{
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetProfile(int userId)
    {
        var profile = await gameService.GetUserProfileAsync(userId);

        return profile is null
            ? NotFound("User not found.")
            : Ok(profile);
    }
}