using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Auth;

public sealed record CurrentUserResponse(
    Guid Id,
    string Name,
    string Email,
    string GoogleSubject,
    SubscriptionType SubscriptionType);

public sealed class AuthEndpoints : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/login/google", LoginWithGoogle)
            .AllowAnonymous()
            .WithTags("Auth")
            .WithSummary("Login with Google")
            .WithDescription("Starts Google OAuth login flow.");

        app.MapPost("/api/auth/logout", async (HttpContext httpContext) =>
            {
                await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return TypedResults.NoContent();
            })
            .WithTags("Auth")
            .WithSummary("Logout")
            .WithDescription("Signs out current user session.")
            .Produces(StatusCodes.Status204NoContent);

        app.MapGet("/api/auth/me", Me)
            .WithTags("Auth")
            .WithSummary("Current user")
            .WithDescription("Returns currently authenticated user profile.")
            .Produces<CurrentUserResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static ChallengeHttpResult LoginWithGoogle([FromQuery] string? returnUrl)
    {
        var authenticationProperties = new AuthenticationProperties
        {
            RedirectUri = string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl
        };

        return TypedResults.Challenge(authenticationProperties, [GoogleDefaults.AuthenticationScheme]);
    }

    private static async Task<Results<Ok<CurrentUserResponse>, UnauthorizedHttpResult, NotFound>> Me(
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!currentUserContext.IsAuthenticated || !currentUserContext.UserId.HasValue)
        {
            return TypedResults.Unauthorized();
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == currentUserContext.UserId.Value, cancellationToken);

        if (user is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new CurrentUserResponse(
            user.Id,
            user.Name,
            user.Email,
            user.GoogleSubject,
            user.SubscriptionType));
    }
}
