using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Settings;

public sealed record UserSettingsResponse(string BaseCurrency);

public sealed record UpdateUserSettingsRequest(string BaseCurrency);

public sealed class SettingsEndpoints : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/settings", Get)
            .WithTags("Settings")
            .WithSummary("Get user settings")
            .WithDescription("Returns current user settings.")
            .Produces<UserSettingsResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        app.MapPut("/api/settings", Update)
            .WithTags("Settings")
            .WithSummary("Update user settings")
            .WithDescription("Updates current user settings.")
            .Produces<UserSettingsResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<UserSettingsResponse>, NotFound>> Get(
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);

        if (user is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new UserSettingsResponse(user.BaseCurrency));
    }

    private static async Task<Results<Ok<UserSettingsResponse>, NotFound, ValidationProblem>> Update(
        [FromBody] UpdateUserSettingsRequest request,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.BaseCurrency) || request.BaseCurrency.Trim().Length != 3)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.BaseCurrency)] = ["BaseCurrency must be a 3-letter code."],
            });
        }

        var userId = currentUserContext.GetScopedUserId();

        var user = await dbContext.Users
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);

        if (user is null)
        {
            return TypedResults.NotFound();
        }

        user.BaseCurrency = request.BaseCurrency.Trim().ToUpperInvariant();

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UserSettingsResponse(user.BaseCurrency));
    }
}
