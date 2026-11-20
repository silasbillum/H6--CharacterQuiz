using System.Collections.Concurrent;

namespace api.Services;

public sealed class LobbyService(CharacterService characterService)
{
    private const int MaxPlayers = 4;
    private const int RoundSeconds = 30;
    private const int CharacterAnswerPoints = 100;
    private const int AnimeAnswerPoints = 50;
    private const int MaxSpeedBonus = 100;
    private const int StreakBonusPercent = 10;
    private const int MaxStreakMultiplierPercent = 200;
    private readonly ConcurrentDictionary<string, Lobby> lobbies = new();

    public LobbySnapshot CreateLobby(string playerName, int? userId)
    {
        Lobby lobby;
        do
        {
            lobby = new Lobby(CreateCode());
        } while (!lobbies.TryAdd(lobby.Code, lobby));

        lock (lobby)
        {
            lobby.Players.Add(new Player(Guid.NewGuid().ToString(), playerName, true, userId));
            return lobby.Snapshot();
        }
    }

    public LobbySnapshot? JoinLobby(string code, string playerName, int? userId)
    {
        var lobby = Find(code);
        if (lobby is null)
        {
            return null;
        }

        lock (lobby)
        {
            if (lobby.Started || lobby.Players.Count >= MaxPlayers)
            {
                return null;
            }

            lobby.Players.Add(new Player(Guid.NewGuid().ToString(), playerName, false, userId));
            return lobby.Snapshot();
        }
    }

    public LobbySnapshot? GetLobby(string code)
    {
        var lobby = Find(code);
        if (lobby is null)
        {
            return null;
        }

        lock (lobby)
        {
            AdvanceRound(lobby);
            return lobby.Snapshot();
        }
    }

    public LobbySnapshot? SetReady(string code, string playerId, bool isReady)
    {
        var lobby = Find(code);
        if (lobby is null)
        {
            return null;
        }

        lock (lobby)
        {
            var player = FindPlayer(lobby, playerId);
            if (player is null)
            {
                return null;
            }

            player.IsReady = isReady;
            return lobby.Snapshot();
        }
    }

    public LobbySnapshot? StartGame(string code, string playerId)
    {
        var lobby = Find(code);
        if (lobby is null)
        {
            return null;
        }

        lock (lobby)
        {
            var player = FindPlayer(lobby, playerId);
            if (player is null || !player.IsHost || lobby.Players.Count < 2)
            {
                return null;
            }

            lobby.Started = true;
            lobby.StartedAt = DateTimeOffset.UtcNow;
            StartRound(lobby);
            return lobby.Snapshot();
        }
    }

    public LobbySnapshot? RestartGame(string code, string playerId)
{
    var lobby = Find(code);

    if (lobby is null)
    {
        return null;
    }

    lock (lobby)
    {
        var player = FindPlayer(lobby, playerId);

        if (player is null || !player.IsHost || !lobby.GameOver)
        {
            return null;
        }

        foreach (var lobbyPlayer in lobby.Players)
        {
            lobbyPlayer.Score = 0;
            lobbyPlayer.CurrentStreak = 0;
            lobbyPlayer.MaxStreak = 0;
            lobbyPlayer.CorrectGuesses = 0;
            lobbyPlayer.TotalGuesses = 0;
        }

        lobby.Started = true;
        lobby.StartedAt = DateTimeOffset.UtcNow;
        lobby.GameOver = false;
        StartRound(lobby);

        return lobby.Snapshot();
    }
}

    public LobbySnapshot? SubmitAnswer(string code, string playerId, string answer)
    {
        var lobby = Find(code);
        if (lobby is null)
        {
            return null;
        }

        lock (lobby)
        {
            var player = FindPlayer(lobby, playerId);
            if (player is null || !lobby.Started || lobby.CurrentQuestion is null)
            {
                return null;
            }

            if (lobby.GameOver)
            {
                return lobby.Snapshot();
            }

                        if (DateTimeOffset.UtcNow >= lobby.RoundEndsAt)
            {
                AdvanceRound(lobby);
                return lobby.Snapshot();
            }

        if (lobby.AnsweredPlayers.Add(playerId))
        {
            player.TotalGuesses++;

            var answerType = GetAnswerType(answer, lobby.CurrentQuestion);

            if (answerType is null)
            {
                player.CurrentStreak = 0;
            }
            else
            {
                player.CurrentStreak++;
                player.MaxStreak = Math.Max(player.MaxStreak, player.CurrentStreak);

                player.Score += CalculatePoints(
                    answerType.Value,
                    player.CurrentStreak,
                    lobby.RoundEndsAt);
                    lobby.RoundHadCorrectAnswer = true;
                    player.CorrectGuesses++;
            }
        }

            AdvanceRound(lobby);
            return lobby.Snapshot();
        }
    }

    private Lobby? Find(string code) =>
        lobbies.TryGetValue(code.Trim().ToUpperInvariant(), out var lobby) ? lobby : null;

    private static Player? FindPlayer(Lobby lobby, string playerId) =>
        lobby.Players.FirstOrDefault(player => player.Id == playerId);

    private static AnswerType? GetAnswerType(string answer, Character question)
    {
    var value = Normalize(answer);

    if (value == Normalize(question.CharacterName))
    {
        return AnswerType.Character;
    }

    if (value == Normalize(question.ShowName))
    {
        return AnswerType.Anime;
    }

    return null;
    }

    private static int CalculatePoints(
    AnswerType answerType,
    int currentStreak,
    DateTimeOffset roundEndsAt)
    {
    var basePoints = answerType == AnswerType.Character
        ? CharacterAnswerPoints
        : AnimeAnswerPoints;

    var secondsRemaining = Math.Clamp(
        (int)Math.Ceiling((roundEndsAt - DateTimeOffset.UtcNow).TotalSeconds),
        0,
        RoundSeconds);

    var speedBonus = MaxSpeedBonus * secondsRemaining / RoundSeconds;

    var streakMultiplier = Math.Min(
        100 + (currentStreak - 1) * StreakBonusPercent,
        MaxStreakMultiplierPercent);

    return (basePoints + speedBonus) * streakMultiplier / 100;
    }

    private void AdvanceRound(Lobby lobby)
    {
        if (lobby.CurrentQuestion is null ||
            (DateTimeOffset.UtcNow < lobby.RoundEndsAt &&
             lobby.AnsweredPlayers.Count < lobby.Players.Count))
        {
            return;
        }

        if (!lobby.RoundHadCorrectAnswer)
        {
            lobby.GameOver = true;
            return;
        }

        StartRound(lobby);
    }

    private void StartRound(Lobby lobby)
    {
        lobby.AnsweredPlayers.Clear();
        lobby.RoundHadCorrectAnswer = false;
        lobby.CurrentQuestion = characterService.GetRandomCharacter();
        lobby.RoundEndsAt = DateTimeOffset.UtcNow.AddSeconds(RoundSeconds);
    }

    private static string Normalize(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    private static string CreateCode() =>
        Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

    private sealed class Lobby(string code)
    {
        public string Code { get; } = code;
        public List<Player> Players { get; } = [];
        public HashSet<string> AnsweredPlayers { get; } = [];
        public bool Started { get; set; }
        public Character? CurrentQuestion { get; set; }
        public DateTimeOffset RoundEndsAt { get; set; }
        public DateTimeOffset StartedAt { get; set; } 
        public bool GameOver { get; set; }
        public bool RoundHadCorrectAnswer { get; set; }

        public LobbySnapshot Snapshot() => new(
            Code,
            Started,
            GameOver,
            StartedAt,
            CurrentQuestion,
            RoundEndsAt,
            AnsweredPlayers.Count,
            Players.Select(player => new LobbyPlayerSnapshot(
                player.Id,
                player.UserId,
                player.Name,
                player.IsHost,
                player.IsReady,
                player.Score,
                player.CurrentStreak,
                player.MaxStreak,
                player.TotalGuesses,
                player.CorrectGuesses)).ToList());
    }

    private sealed class Player(string id, string name, bool isHost, int? userId)
    {
        public string Id { get; } = id;
        public string Name { get; } = name;
        public int? UserId { get; } = userId;
        public bool IsHost { get; } = isHost;
        public bool IsReady { get; set; }
        public int Score { get; set; }
        public int CurrentStreak { get; set; }
        public int MaxStreak { get; set; }
        public int CorrectGuesses { get; set; }
        public int TotalGuesses { get; set; }
    }

    private enum AnswerType
    {
        Character,
        Anime
    }
}

public sealed record LobbySnapshot(
    string Code,
    bool Started,
    bool GameOver,
    DateTimeOffset StartedAt,
    Character? CurrentQuestion,
    DateTimeOffset RoundEndsAt,
    int AnsweredPlayers,
    IReadOnlyList<LobbyPlayerSnapshot> Players);

public sealed record LobbyPlayerSnapshot(
    string Id,
    int? UserId,
    string Name,
    bool IsHost,
    bool IsReady,
    int Score,
    int CurrentStreak,
    int MaxStreak,
    int TotalGuesses,
    int CorrectGuesses);
