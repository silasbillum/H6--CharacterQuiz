using System.Text.Json;

namespace api.Services;

public sealed class CharacterService
{
    private readonly List<AniListTvExport> _shows;

    public CharacterService()
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "Data",
            "AniList_TV_List.json");

        if (!File.Exists(path))
        {
            throw new FileNotFoundException("Character data was not found.", path);
        }

        _shows = JsonSerializer.Deserialize<List<AniListTvExport>>(
            File.ReadAllText(path)) ?? [];
    }

    public List<Character> GetAllCharacters()
    {
        var characters = new List<Character>();

        foreach (var show in _shows)
        {
            foreach (var character in show.characters.Where(character =>
                !string.IsNullOrWhiteSpace(character.name)
                && Uri.IsWellFormedUriString(character.imageUrl, UriKind.Absolute)))
            {
                characters.Add(new Character
                {
                    Id = character.id,
                    CharacterName = character.name,
                    ShowName = show.title,
                    ShowId = show.id,
                    ShowType = "Anime",
                    ImageUrl = character.imageUrl
                });
            }
        }

        return characters;
    }

    public Character? GetRandomCharacter()
    {
        var characters = GetAllCharacters();
        return characters.Count == 0
            ? null
            : characters[Random.Shared.Next(characters.Count)];
    }

    public List<Character> SearchCharacters(string query)
    {
        var normalizedQuery = Normalize(query);
        var matches = GetAllCharacters()
            .Select(character => new
            {
                Character = character,
                Score = GetMatchScore(normalizedQuery, character)
            })
            .Where(result => result.Score < int.MaxValue)
            .OrderBy(result => result.Score)
            .ToList();

        var showSuggestions = matches
            .GroupBy(result => result.Character.ShowName)
            .Select(group => new
            {
                Character = new Character
                {
                    CharacterName = group.Key,
                    ShowName = group.Key,
                    ShowType = "AnimeTitle",
                    SuggestionType = "AnimeTitle"
                },
                Score = group.Min(result => result.Score)
            });

        return showSuggestions
            .Concat(matches.Select(result => new
            {
                result.Character,
                result.Score
            }))
            .OrderBy(result => result.Score)
            .ThenBy(result => result.Character.SuggestionType == "Character" ? 1 : 0)
            .Take(10)
            .Select(result => result.Character)
            .ToList();
    }

    private static int GetMatchScore(string query, Character character)
    {
        var characterName = Normalize(character.CharacterName);
        var showName = Normalize(character.ShowName);

        if (characterName.Contains(query))
        {
            return query.Length == characterName.Length ? 0 : 1;
        }

        if (showName.Contains(query))
        {
            return 2;
        }

        var distance = Math.Min(
            LevenshteinDistance(query, characterName),
            characterName
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(token => LevenshteinDistance(query, token))
                .DefaultIfEmpty(int.MaxValue)
                .Min());

        return distance <= Math.Max(2, query.Length / 3)
            ? 3 + distance
            : int.MaxValue;
    }

    private static string Normalize(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    private static int LevenshteinDistance(string first, string second)
    {
        var distances = Enumerable.Range(0, second.Length + 1).ToArray();

        for (var index = 1; index <= first.Length; index++)
        {
            var previous = distances[0];
            distances[0] = index;

            for (var secondIndex = 1; secondIndex <= second.Length; secondIndex++)
            {
                var current = distances[secondIndex];
                distances[secondIndex] = first[index - 1] == second[secondIndex - 1]
                    ? previous
                    : 1 + Math.Min(
                        previous,
                        Math.Min(distances[secondIndex], distances[secondIndex - 1]));
                previous = current;
            }
        }

        return distances[second.Length];
    }
}
