
public class TmdbMovie
{
    public int id { get; set; }
    public string title { get; set; }
    public List<int> genre_ids { get; set; }
    public List<TmdbGenre> genres { get; set; }
    public TmdbCredits credits { get; set; }
}

public class TmdbMovieListResponse
{
    public int page { get; set; }
    public List<TmdbMovie> results { get; set; }
    public int total_pages { get; set; }
    public int total_results { get; set; }
}

public class TmdbGenre
{
    public int id { get; set; }
    public string name { get; set; }
}

public class TmdbCast
{
    public string name { get; set; }
    public string character { get; set; }
}

public class TmdbCredits
{
    public List<TmdbCast> cast { get; set; }
}

public class TmdbMovieExport
{
    public int id { get; set; }
    public string title { get; set; }
    public List<string> characters { get; set; }
    public List<TmdbGenre> genres { get; set; }
}

public class TmdbTv
{
    public int id { get; set; }
    public string name { get; set; }
    public List<TmdbGenre> genres { get; set; }
    public TmdbCredits credits { get; set; }
}

public class TmdbTvListResponse
{
    public int page { get; set; }
    public List<TmdbTv> results { get; set; }
    public int total_pages { get; set; }
    public int total_results { get; set; }
}

public class TmdbTvExport
{
    public int id { get; set; }
    public string name { get; set; }
    public List<string> characters { get; set; }
    public List<TmdbGenre> genres { get; set; }
}