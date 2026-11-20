using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

// EF Core uses this context to map the User model to the PostgreSQL database.
// Keeping the mapping here makes the database rules explicit and testable.
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Game> Game => Set<Game>();
    public DbSet<GamePlayer> GamePlayers => Set<GamePlayer>();
    public DbSet<CharacterStats> CharacterStats => Set<CharacterStats>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Usernames are unique so authentication always resolves to one account.
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.HasIndex(user => user.Username).IsUnique();
            entity.Property(user => user.Username).HasMaxLength(100).IsRequired();
            entity.Property(user => user.HashPassword).IsRequired();
        });

        modelBuilder.Entity<Game>(entity =>
        {
        entity.HasKey(game => game.Id);

        entity.Property(game => game.GameMode)
            .HasMaxLength(20)
            .IsRequired();

        entity.Property(game => game.Difficulty)
            .HasMaxLength(20)
            .IsRequired();

        entity.HasMany(game => game.Players)
            .WithOne(player => player.Game)
            .HasForeignKey(player => player.GameId)
            .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GamePlayer>(entity =>
        {
            entity.HasKey(player => player.Id);

            entity.HasOne(player => player.User)
                .WithMany()
                .HasForeignKey(player => player.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(player => new
            {
                player.GameId,
                player.UserId,
            });
        });

        modelBuilder.Entity<CharacterStats>(entity =>
        {
            entity.HasKey(stats => stats.Id);

            entity.HasIndex(stats => stats.CharacterId)
                .IsUnique();

            entity.Property(stats => stats.CharacterName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(stats => stats.ShowName)
                .HasMaxLength(200)
                .IsRequired();
        });
    }
}
