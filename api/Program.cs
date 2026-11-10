using api.TMDB;
using System.Text.Json;
using api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddSingleton<CharacterService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Configure the shared HTTP client used for TMDB requests.
builder.Services.AddHttpClient<TmdbService>(client =>
{
    client.BaseAddress = new Uri("https://api.themoviedb.org/3/");
});

var app = builder.Build();

app.UseCors("Frontend");
app.MapControllers();

// The movie ID is supplied in the URL, for example: /movie/862.
app.MapGet("/movie/{movieId:int}", async (int movieId, TmdbService tmdbService) =>
{
    var movie = await tmdbService.GetMovieAsync(movieId);

    if (!movie.genres.Any(genre => genre.id == 16))
    {
        return Results.BadRequest("The movie is not animated.");
    }

    return Results.Ok(movie);
});

// Returns animated movies with useful character credits.
app.MapGet("/movies/animated", async (int? page, TmdbService tmdbService) =>
{
    var movies = await tmdbService.GetAnimatedMoviesForExportAsync(page ?? 1);
    return Results.Ok(movies);
});

// Fetches movies and saves the compact result to the local JSON file.
app.MapPost("/movies/animated/export", async (
    int? pages,
    TmdbService tmdbService,
    IHostEnvironment environment) =>
{
    //gets movies
    var movies = await tmdbService.GetAnimatedMoviesForExportAsync(pages ?? 10);

    //Locates the data directory and creates it if it doesn't exist
    var dataDirectory = Path.Combine(environment.ContentRootPath, "Data");
    Directory.CreateDirectory(dataDirectory);

    //file path for the json file and serializes the movies to json and writes it to the file
    var filePath = Path.Combine(dataDirectory, "TMDB_List.json");
    var json = JsonSerializer.Serialize(movies, new JsonSerializerOptions
    {
        //makes the json more readable with line breaks and indentation
        WriteIndented = true
    });

    //writes the json to the file
    await File.WriteAllTextAsync(filePath, json);
    return Results.Ok(new { movies.Count, filePath });
});

// Fetches animated TV shows and saves them to a separate JSON file.
app.MapPost("/tv/animated/export", async (
    int? pages,
    TmdbService tmdbService,
    IHostEnvironment environment) =>
{
    var shows = await tmdbService.GetAnimatedTvForExportAsync(pages ?? 10);
    var dataDirectory = Path.Combine(environment.ContentRootPath, "Data");
    Directory.CreateDirectory(dataDirectory);

    var filePath = Path.Combine(dataDirectory, "TMDB_TV_List.json");
    var json = JsonSerializer.Serialize(shows, new JsonSerializerOptions
    {
        WriteIndented = true
    });

    await File.WriteAllTextAsync(filePath, json);
    return Results.Ok(new { shows.Count, filePath });
});

if (app.Environment.IsDevelopment())
{
    // Expose the OpenAPI document and Swagger UI during development.
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.RoutePrefix = "swagger";
        options.SwaggerEndpoint("/openapi/v1.json", "Character Quiz API");
    });
}

app.UseHttpsRedirection();

app.Run();