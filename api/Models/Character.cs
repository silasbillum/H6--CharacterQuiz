
// This is the common shape returned to the frontend for random questions and
// search results, so both game modes can use the same response type.
public class Character
{
    public int Id { get; set; }
    public string CharacterName { get; set; } = "";
    public string ShowName { get; set; } = "";
    public int  ShowId { get; set; }
    public string ShowType { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public string SuggestionType { get; set; } = "Character";
}

public class CharacterStats
{
    public int Id { get; set; }
    public int CharacterId { get; set; }   // the AniList id
    public string CharacterName { get; set; } = "";
    public string ShowName { get; set; } = "";
    public int Attempts { get; set; }
    public int Correct { get; set; }
}