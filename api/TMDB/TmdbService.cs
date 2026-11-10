using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace api.TMDB;

public class TmdbService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public TmdbService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;

    // The TMDB API requires a Bearer token for authentication. The token is stored in the appsettings.json file.
        var token = _configuration["Tmdb:Token"];
        

        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }
    // Fetches movie details from TMDB, including the credits (cast and crew).
    public async Task<TmdbMovie> GetMovieAsync(int movieId)
    {
        var response = await _httpClient.GetFromJsonAsync<TmdbMovie>(
            $"movie/{movieId}?append_to_response=credits");

        return response ?? throw new Exception("TMDB returned no movie data.");
    }
    // Finds animated movies and keeps only useful character names for the JSON export.
    public async Task<List<TmdbMovieExport>> GetAnimatedMoviesForExportAsync(int pages = 10)
    {
        var movies = new List<TmdbMovieExport>();
        var seenMovieIds = new HashSet<int>();

        for (var page = 1; page <= pages; page++)
        {
            var response = await _httpClient.GetFromJsonAsync<TmdbMovieListResponse>(
                $"discover/movie?with_genres=16&sort_by=popularity.desc&page={page}");

            if (response is null)
            {
                continue;
            }

            foreach (var movieSummary in response.results)
            {
                if (!seenMovieIds.Add(movieSummary.id))
                {
                    continue;
                }

                var movie = await GetMovieAsync(movieSummary.id);
                var characters = movie.credits?.cast?
                    .Where(cast => IsUsefulCharacter(cast.character))
                    .Select(cast => cast.character.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? [];

                if (characters.Count > 0)
                {
                    movies.Add(new TmdbMovieExport
                    {
                        id = movie.id,
                        title = movie.title,
                        characters = characters,
                        genres = movie.genres
                    });
                }
            }
        }

        return movies;
    }

    // Finds animated TV shows and keeps only useful character names for a separate JSON export.
    public async Task<List<TmdbTvExport>> GetAnimatedTvForExportAsync(int pages = 10)
    {
        var shows = new List<TmdbTvExport>();
        var seenShowIds = new HashSet<int>();

        for (var page = 1; page <= pages; page++)
        {
            var response = await _httpClient.GetFromJsonAsync<TmdbTvListResponse>(
                $"discover/tv?with_genres=16&sort_by=popularity.desc&page={page}");

            if (response is null)
            {
                continue;
            }

            foreach (var showSummary in response.results)
            {
                if (!seenShowIds.Add(showSummary.id))
                {
                    continue;
                }

                var show = await GetTvAsync(showSummary.id);
                var characters = show.credits?.cast?
                    .Where(cast => IsUsefulCharacter(cast.character))
                    .Select(cast => cast.character.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? [];

                if (characters.Count > 0)
                {
                    shows.Add(new TmdbTvExport
                    {
                        id = show.id,
                        name = show.name,
                        characters = characters,
                        genres = show.genres
                    });
                }
            }
        }

        return shows;
    }

    private async Task<TmdbTv> GetTvAsync(int tvId)
    {
        var response = await _httpClient.GetFromJsonAsync<TmdbTv>(
            $"tv/{tvId}?append_to_response=credits");

        return response ?? throw new Exception("TMDB returned no TV data.");
    }

    private static bool IsUsefulCharacter(string? character)
    {
        if (string.IsNullOrWhiteSpace(character))
        {
            return false;
        }
        // Normalize the character name for comparison.
        var value = character.Trim().ToLowerInvariant();
        // tried to filter out generic roles like "additional voices" or "uncredited" to keep the character list more meaningful.
        var genericRoles = new[]
        {
            "additional voice",
            "additional voices",
            "kid",
            "child",
            "boy",
            "girl",
            "various voices",
            "uncredited",
            "officer",
            "soldier",
            "guard",
            "villager",
            "citizen",
            "passenger",
            "bystander",
        };
        //if it contains any of the names it doesnt use them
        return !genericRoles.Any(role => value.Contains(role));
    }
}