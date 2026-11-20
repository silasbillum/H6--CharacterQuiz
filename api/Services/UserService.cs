using api.Data;
using api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class UserService
{
    // Database access and password hashing live in a service so controllers do
    // not need to know how users are stored or how passwords are protected.
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserService(
        ApplicationDbContext dbContext,
        IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public User? Authenticate(string username, string password)
    {
        // PasswordHasher verifies the salted hash; the plaintext password is
        // never persisted or compared directly.
        var user = _dbContext.Users.SingleOrDefault(user => user.Username == username);
        if (user is null)
        {
            return null;
        }

        var verification = _passwordHasher.VerifyHashedPassword(
            user,
            user.HashPassword,
            password);

        return verification == PasswordVerificationResult.Failed ? null : user;
    }

    public User? Register(string username, string password)
    {
        // Checking before inserting gives the controller a simple conflict
        // result and avoids creating duplicate usernames.
        if (_dbContext.Users.Any(user => user.Username == username))
        {
            return null;
        }

        var user = new User
        {
            Username = username
        };
        // ASP.NET Identity generates a unique salted hash for every password.
        user.HashPassword = _passwordHasher.HashPassword(user, password);

        _dbContext.Users.Add(user);
        _dbContext.SaveChanges();
        return user;
    }
}
