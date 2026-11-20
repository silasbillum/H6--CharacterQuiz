namespace api.Models;

// User stores the database record. HashPassword contains only the generated
// password hash; the original password is never part of this model.
public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string HashPassword { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}