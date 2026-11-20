using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController(LeaderboardService leaderboardService) : ControllerBase
{
    [HttpGet("solo")]
    public async Task<IActionResult> GetSoloLeaderboard()
    {
        var leaderboard = await leaderboardService.GetSoloLeaderboardAsync();

        return Ok(leaderboard);
    }
}