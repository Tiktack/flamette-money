using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record AccountListItemResponse(
    Guid Id,
    string Name,
    string Currency,
    string Color,
    string Icon,
    AccountType Type,
    decimal CurrentBalance);

public sealed class ListAccountsEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/accounts", Handle)
            .WithTags("Accounts")
            .WithSummary("List accounts")
            .WithDescription("List all accounts with current balances.")
            .Produces<IEnumerable<AccountListItemResponse>>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<List<AccountListItemResponse>>> Handle(
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var accounts = await dbContext.Accounts
            .AsNoTracking()
            .ForUser(userId)
            .OrderBy(account => account.Name)
            .Select(account => new AccountListItemResponse(
                account.Id,
                account.Name,
                account.Currency,
                account.Color,
                account.Icon,
                account.Type,
                account.CurrentBalance))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(accounts);
    }
}
