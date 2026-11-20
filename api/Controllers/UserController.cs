using Microsoft.AspNetCore.Mvc;
using api.Models;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
// Authentication stays intentionally small for this project: the controller
// validates input, delegates hashing work, and returns a safe public response.
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }

    [HttpPost("login")]
    public IActionResult Login([FromQuery] string username, [FromQuery] string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest("Username and password are required.");
        }

        // Keep password whitespace intact; only usernames are normalized.
        var user = _userService.Authenticate(username.Trim(), password);

        if (user == null)
        {
            return Unauthorized("Invalid username or password.");
        }

        // Return a safe projection instead of exposing the password hash.
        return Ok(new UserResponse(user.Id, user.Username, user.CreatedAt));
    }

    [HttpPost("register")]
    public IActionResult Register([FromQuery] string username, [FromQuery] string password)
    {
        // The API rejects missing values before reaching the database so bad
        // requests do not become empty user records.
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest("Username and password are required.");
        }

        var user = _userService.Register(username.Trim(), password);

        if (user == null)
        {
            return Conflict("Username already exists.");
        }

        return Ok(new UserResponse(user.Id, user.Username, user.CreatedAt));
    }

    private sealed record UserResponse(int Id, string Username, DateTime CreatedAt);
}