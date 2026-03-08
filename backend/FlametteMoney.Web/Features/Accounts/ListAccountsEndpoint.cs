using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record AccountListItemResponse(
    Guid Id,
    string Name,
    string? Description,
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
        [FromServices] IExchangeRateService exchangeRateService,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();
        var userBaseCurrency = await dbContext.Users
            .AsNoTracking()
            .Where(item => item.Id == userId)
            .Select(item => item.BaseCurrency)
            .FirstOrDefaultAsync(cancellationToken);
        var baseCurrency = SupportedCurrencies.NormalizeOrDefault(userBaseCurrency, "USD");
        var fxSnapshot = await exchangeRateService.GetRatesToBaseAsync(baseCurrency, cancellationToken);

        var accounts = await dbContext.Accounts
            .AsNoTracking()
            .ForUser(userId)
            .Select(account => new AccountListItemResponse(
                account.Id,
                account.Name,
                account.Description,
                account.Currency,
                account.Color,
                account.Icon,
                account.Type,
                account.CurrentBalance))
            .ToListAsync(cancellationToken);

        var orderedAccounts = accounts
            .OrderByDescending(account =>
            {
                var currency = SupportedCurrencies.NormalizeOrDefault(account.Currency, baseCurrency);
                var rate = fxSnapshot.RatesToBase[currency];
                return account.CurrentBalance * rate;
            })
            .ThenBy(account => account.Name)
            .ToList();

        return TypedResults.Ok(orderedAccounts);
    }
}
