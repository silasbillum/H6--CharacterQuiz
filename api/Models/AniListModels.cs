// These classes match the small part of the AniList export needed to build
// playable character data without requesting AniList during every round.
public class AniListTvExport
{
    public int id { get; set; }
    public string title { get; set; } = "";
    public List<AniListCharacter> characters { get; set; } = [];
}

public class AniListCharacter
{
    public int id { get; set; }
    public string name { get; set; } = "";
    public string imageUrl { get; set; } = "";
}
