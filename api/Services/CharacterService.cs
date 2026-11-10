using System.Text.Json;


namespace api.Services
{
    public class CharacterService
    {
        private readonly List<TmdbMovieExport> _movies;
        private readonly List<TmdbTvExport> _tvShows;

        public CharacterService()
        {
            // Build paths relative to the compiled API output directory.
            var moviesPath = Path.Combine(
                AppContext.BaseDirectory, "Data", "TMDB_List.json");

            var tvShowsPath = Path.Combine(
                AppContext.BaseDirectory, "Data", "TMDB_TV_List.json");

            // Read both exported datasets once when the service is created.
            var moviesJson = File.ReadAllText(moviesPath);
            var tvShowsJson = File.ReadAllText(tvShowsPath);

            // Convert the JSON text into objects used by the character service.
            _movies = JsonSerializer.Deserialize<List<TmdbMovieExport>>(moviesJson)
                ?? new List<TmdbMovieExport>();

            _tvShows = JsonSerializer.Deserialize<List<TmdbTvExport>>(tvShowsJson)
                ?? new List<TmdbTvExport>();
        }

        public List<Character> GetAllCharacters()
        {
            var characters = new List<Character>();
            int characterId = 1;

            // Get characters from movies
            foreach (var movie in _movies)
            {
                foreach (var characterName in movie.characters ?? new List<string>())
                {
                    characters.Add(new Character
                    {
                        Id = characterId++,
                        CharacterName = characterName.Replace("(voice)", "").Trim(),
                        ShowName = movie.title,
                        ShowId = movie.id,
                        ShowType = "Movie",
                        ImageUrl = ""
                    });
                }
            }

            // Get characters from TV shows
            foreach (var show in _tvShows)
            {
                foreach (var characterName in show.characters ?? new List<string>())
                {
                    characters.Add(new Character
                    {
                        Id = characterId++,
                        CharacterName = characterName.Replace("(voice)", "").Trim(),
                        ShowName = show.name,
                        ShowId = show.id,
                        ShowType = "TV",
                        ImageUrl = ""
                    });
                }
            }

            return characters;
        }
        
                public Character? GetRandomCharacter()
        {
            var characters = GetAllCharacters();

            if (characters.Count == 0)
            {
                return null;
            }

            Random random = new Random();

            int randomIndex = random.Next(characters.Count);

            return characters[randomIndex];
        }
    }
}