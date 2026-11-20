using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public sealed class LeaderboardService(ApplicationDbContext dbContext)
{
    public async Task<IReadOnlyList<SoloLeaderboardEntry>> GetSoloLeaderboardAsync()
    {
        var soloGames = await dbContext.GamePlayers
            .AsNoTracking()
            .Include(player => player.User)
            .Include(player => player.Game)
            .Where(player =>
                player.UserId != null &&
                player.User != null &&
                player.Game.GameMode == "Solo")
            .OrderByDescending(player => player.Points)
            .ThenByDescending(player => player.BestStreak)
            .ThenByDescending(player => player.Game.EndedAt)
            .ToListAsync();

        return soloGames
            .GroupBy(player => player.UserId!.Value)
            .Select(group => group.First())
            .Take(10)
            .Select((player, index) => new SoloLeaderboardEntry(
                index + 1,
                player.User!.Username,
                player.Points,
                player.BestStreak))
            .ToList();
    }
}

public sealed record SoloLeaderboardEntry(
    int Rank,
    string Username,
    int Points,
    int BestStreak);