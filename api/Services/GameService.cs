using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public sealed class GameService(ApplicationDbContext dbContext, CharacterService characterService)
{
    public async Task<GamePlayer?> SaveGameAsync(SaveGameRequest request)
    {
        if (request.UserId is not null)
        {
            var userExists = await dbContext.Users.AnyAsync(user => user.Id == request.UserId);
            if (!userExists)
            {
                return null;
            }
        }

        var game = new Game
        {
            GameMode = request.GameMode,
            Difficulty = request.Difficulty,
            StartedAt = request.StartedAt,
            EndedAt = request.EndedAt,
        };

        var gamePlayer = new GamePlayer
        {
            UserId = request.UserId,
            Points = request.Points,
            Streak = request.Streak,
            BestStreak = request.BestStreak,
            CorrectGuesses = request.CorrectGuesses,
            TotalGuesses = request.TotalGuesses,
            Placement = request.Placement,
            Game = game
        };

        dbContext.Game.Add(game);
        dbContext.GamePlayers.Add(gamePlayer);
        await dbContext.SaveChangesAsync();
        return gamePlayer;
    }


    public async Task<int?> SaveMultiplayerGameAsync(
        SaveMultiplayerGameRequest request)
    {
        var userIds = request.Players
        .Where(player => player.UserId is not null)
        .Select(player => player.UserId!.Value)
        .Distinct()
        .ToList();

        var existingUsers = await dbContext.Users
            .Where(user => userIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToListAsync();

        if (existingUsers.Count != userIds.Count)
        {
            return null;
        }

        var game = new Game
        {
            GameMode = "Multiplayer",
            Difficulty = request.Difficulty,
            StartedAt = request.StartedAt.UtcDateTime,
            EndedAt = request.EndedAt.UtcDateTime,
        };

            foreach (var player in request.Players)
        {
            game.Players.Add(new GamePlayer
            {
                UserId = player.UserId,
                Points = player.Points,
                Streak = player.Streak,
                BestStreak = player.BestStreak,
                CorrectGuesses = player.CorrectGuesses,
                TotalGuesses = player.TotalGuesses,
                Placement = player.Placement,
            });
        }

        dbContext.Game.Add(game);
        await dbContext.SaveChangesAsync();

        return game.Id;
        }   

        public async Task<UserProfileResult?> GetUserProfileAsync(int userId)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(currentUser => currentUser.Id == userId);

        if (user is null)
        {
            return null;
        }

        var playerResults = await dbContext.GamePlayers
            .AsNoTracking()
            .Include(player => player.Game)
            .Where(player => player.UserId == userId)
            .ToListAsync();

        var recentGames = playerResults
            .OrderByDescending(player => player.Game.EndedAt ?? player.Game.StartedAt)
            .Take(10)
            .Select(player => new RecentGameResult(
                player.Game.Id,
                player.Game.GameMode,
                player.Game.Difficulty,
                player.Points,
                player.Streak,
                player.BestStreak,
                player.CorrectGuesses,
                player.Placement,
                player.Game.StartedAt,
                player.Game.EndedAt ?? player.Game.StartedAt))
            .ToList();

        var soloResults = playerResults
            .Where(player => string.Equals(
                player.Game.GameMode,
                "Solo",
                StringComparison.OrdinalIgnoreCase))
            .ToList();


            var soloCorrectGuesses = soloResults.Sum(player => player.CorrectGuesses);
            var soloTotalGuesses = soloResults.Sum(player => player.TotalGuesses);

            var soloCorrectPercentage = soloTotalGuesses == 0
                ? 0
                : Math.Round(
                    soloCorrectGuesses * 100.0 / soloTotalGuesses,
                    1);

        var multiplayerResults = playerResults
            .Where(player => string.Equals(
                player.Game.GameMode,
                "Multiplayer",
                StringComparison.OrdinalIgnoreCase))
            .ToList();

            var multiplayerCorrectGuesses =
            multiplayerResults.Sum(player => player.CorrectGuesses);

            var multiplayerTotalGuesses =
                multiplayerResults.Sum(player => player.TotalGuesses);

            var multiplayerCorrectPercentage = multiplayerTotalGuesses == 0
                ? 0
                : Math.Round(
                    multiplayerCorrectGuesses * 100.0 / multiplayerTotalGuesses,
                    1);

            var multiplayerWins = multiplayerResults.Count(
                player => player.Placement == 1);

            var multiplayerWinPercentage = multiplayerResults.Count == 0
                ? 0
                : Math.Round(
                    multiplayerWins * 100.0 / multiplayerResults.Count,
                    1);

            return new UserProfileResult(
                user.Id,
                user.Username,
                user.CreatedAt,
                soloResults.Count,
                soloResults.Count == 0 ? 0 : soloResults.Max(player => player.Points),
                soloCorrectGuesses,
                soloResults.Count == 0 ? 0 : soloResults.Max(player => player.BestStreak),
                soloCorrectPercentage,
                multiplayerResults.Count,
                multiplayerResults.Count == 0 ? 0 : multiplayerResults.Max(player => player.Points),
                multiplayerCorrectGuesses,
                multiplayerResults.Count == 0 ? 0 : multiplayerResults.Max(player => player.BestStreak),
                multiplayerCorrectPercentage,
                multiplayerWinPercentage,
                recentGames);
                }

            public async Task RecordCharacterAnswerAsync(
                CharacterAnswerRequest request)
            {
                var stats = await dbContext.CharacterStats
                    .FirstOrDefaultAsync(
                        character => character.CharacterId == request.CharacterId);

                if (stats is null)
                {
                    stats = new CharacterStats
                    {
                        CharacterId = request.CharacterId,
                        CharacterName = request.CharacterName,
                        ShowName = request.ShowName,
                        Attempts = 0,
                        Correct = 0
                    };

                    dbContext.CharacterStats.Add(stats);
                }

                stats.Attempts++;

                if (request.IsCorrect)
                {
                    stats.Correct++;
                }

                await dbContext.SaveChangesAsync();
            }

        public async Task<Character?> GetRandomCharacterAsync(
            string difficulty)
        {
            var characters = characterService.GetAllCharacters();

            var stats = await dbContext.CharacterStats
                .AsNoTracking()
                .ToDictionaryAsync(
                    character => character.CharacterId);

            var candidates = characters
                .Where(character =>
                    GetCharacterDifficulty(character, stats) == difficulty)
                .ToList();

            // If there are not enough statistics yet, use all characters.
            // This keeps every difficulty playable while the database grows.
            if (candidates.Count == 0)
            {
                candidates = characters;
            }

            return candidates.Count == 0
                ? null
                : candidates[Random.Shared.Next(candidates.Count)];
        }

        private static string GetCharacterDifficulty(
            Character character,
            IReadOnlyDictionary<int, CharacterStats> stats)
        {
            if (!stats.TryGetValue(character.Id, out var characterStats))
            {
                return "Normal";
            }

            if (characterStats.Attempts < 20)
            {
                return "Normal";
            }

            var correctPercentage =
                characterStats.Correct * 100.0 / characterStats.Attempts;

            if (correctPercentage >= 80)
            {
                return "Easy";
            }

            if (correctPercentage < 45)
            {
                return "Hard";
            }

            return "Normal";
        }
}

public sealed record SaveGameRequest(
    int? UserId,
    string GameMode,
    string Difficulty,
    int Points,
    int Streak,
    int BestStreak,
    int CorrectGuesses,
    int TotalGuesses,
    int? Placement,
    DateTime StartedAt,
    DateTime EndedAt
);

public sealed record SaveMultiplayerGameRequest(
    string Difficulty,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    IReadOnlyList<MultiplayerPlayerResult> Players
);

public sealed record MultiplayerPlayerResult(
    int? UserId,
    int Points,
    int Streak,
    int BestStreak,
    int CorrectGuesses,
    int TotalGuesses,
    int? Placement
);

public sealed record UserProfileResult(
    int Id, 
    string Username,
    DateTime CreatedAt,
    int SoloGames,
    int BestSoloPoints,
    int SoloCorrectGuesses,
    int SoloBestStreak,
    double SoloCorrectPercentage,
    int MultiplayerGames,
    int BestMultiplayerPoints,
    int MultiplayerCorrectGuesses,
    int MultiplayerBestStreak,
    double MultiplayerCorrectPercentage,
    double MultiplayerWinPercentage,
    IReadOnlyList<RecentGameResult> RecentGames
);

public sealed record RecentGameResult(
    int GameId,
    string GameMode,
    string Difficulty,
    int Points,
    int Streak,
    int BestStreak,
    int CorrectGuesses,
    int? Placement,
    DateTime StartedAt,
    DateTime EndedAt
);

public sealed record CharacterAnswerRequest(
    int CharacterId,
    string CharacterName,
    string ShowName,
    bool IsCorrect
);