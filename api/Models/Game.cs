
namespace api.Models
{
    public class Game
    {
        public int Id { get; set; }
        public string GameMode { get; set; } = "";
        public string Difficulty { get; set; } = "";
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }
        public ICollection<GamePlayer> Players { get; set; } = new List<GamePlayer>();
    }


    public class GamePlayer
    {
        public int Id { get; set; }
        public int GameId { get; set; }
        public int? UserId { get; set; }
        public int Points { get; set; }
        public int Streak { get; set; }
        public int BestStreak { get; set; }
        public int CorrectGuesses { get; set; }
        public int? Placement { get; set; }
        public Game Game { get; set; } = null!;
        public User? User { get; set; }
        public int TotalGuesses { get; set; }
    }
    
}