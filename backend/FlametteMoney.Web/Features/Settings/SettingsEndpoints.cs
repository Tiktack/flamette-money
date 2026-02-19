using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Settings;

public sealed record UserSettingsResponse(string BaseCurrency);

public sealed record UpdateUserSettingsRequest(string BaseCurrency);

public sealed record ResetUserDataResponse(
    int DeletedTransactions,
    int DeletedCategories,
    int DeletedAccounts,
    int DeletedTrips,
    int DeletedTransactionItems);

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

        app.MapPost("/api/settings/reset-data", ResetData)
            .WithTags("Settings")
            .WithSummary("Reset user data")
            .WithDescription("Deletes all current user transactions, categories, accounts, and trips.")
            .Produces<ResetUserDataResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);
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
        if (!SupportedCurrencies.IsSupported(request.BaseCurrency))
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.BaseCurrency)] = [$"BaseCurrency must be one of: {string.Join(", ", SupportedCurrencies.All)}."],
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

    private static async Task<Results<Ok<ResetUserDataResponse>, NotFound>> ResetData(
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var userExists = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(item => item.Id == userId, cancellationToken);

        if (!userExists)
        {
            return TypedResults.NotFound();
        }

        await using var resetTransaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await dbContext.Transactions
            .ForUser(userId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(transaction => transaction.OriginalTransactionId, (Guid?)null)
                .SetProperty(transaction => transaction.RelatedTransactionId, (Guid?)null),
                cancellationToken);

        var deletedTransactionItems = await dbContext.TransactionItems
            .Where(item => item.Transaction.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedTransactions = await dbContext.Transactions
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedTrips = await dbContext.Trips
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedChildCategories = await dbContext.Categories
            .ForUser(userId)
            .Where(category => category.ParentId != null)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedParentCategories = await dbContext.Categories
            .ForUser(userId)
            .Where(category => category.ParentId == null)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedAccounts = await dbContext.Accounts
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        await resetTransaction.CommitAsync(cancellationToken);

        return TypedResults.Ok(new ResetUserDataResponse(
            deletedTransactions,
            deletedChildCategories + deletedParentCategories,
            deletedAccounts,
            deletedTrips,
            deletedTransactionItems));
    }
}
