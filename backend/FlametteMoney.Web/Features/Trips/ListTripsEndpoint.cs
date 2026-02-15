using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Trips;

public sealed record TripListItemResponse(
    Guid Id,
    string Name,
    DateTime? StartDate,
    DateTime? EndDate,
    string? ImageUrl,
    int TransactionCount,
    decimal TotalExpenseAmount);

public sealed class ListTripsEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips", Handle)
            .WithTags("Trips")
            .WithSummary("List trips")
            .WithDescription("List trips with expense totals.")
            .Produces<IEnumerable<TripListItemResponse>>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<List<TripListItemResponse>>> Handle(
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

        var trips = await dbContext.Trips
            .AsNoTracking()
            .ForUser(userId)
            .OrderBy(trip => trip.StartDate == null)
            .ThenByDescending(trip => trip.StartDate)
            .ThenBy(trip => trip.Name)
            .Select(trip => new
            {
                trip.Id,
                trip.Name,
                trip.StartDate,
                trip.EndDate,
                trip.ImageUrl,
                TransactionCount = trip.Transactions.Count(transaction => transaction.Type == TransactionType.Expense)
            })
            .ToListAsync(cancellationToken);

        var tripIds = trips.Select(trip => trip.Id).ToList();
        var expenseTransactions = await dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Where(transaction =>
                transaction.Type == TransactionType.Expense &&
                transaction.TripId != null &&
                tripIds.Contains(transaction.TripId.Value))
            .Select(transaction => new
            {
                TripId = transaction.TripId!.Value,
                transaction.Amount,
                Currency = transaction.Currency ?? transaction.Account.Currency,
            })
            .ToListAsync(cancellationToken);

        var totalsByTrip = new Dictionary<Guid, decimal>();
        foreach (var expense in expenseTransactions)
        {
            var sourceCurrency = expense.Currency.Trim().ToUpperInvariant();
            var rate = fxSnapshot.RatesToBase[sourceCurrency];

            var converted = expense.Amount * rate;
            if (!totalsByTrip.TryAdd(expense.TripId, converted))
            {
                totalsByTrip[expense.TripId] += converted;
            }
        }

        var response = trips
            .Select(trip => new TripListItemResponse(
                trip.Id,
                trip.Name,
                trip.StartDate,
                trip.EndDate,
                trip.ImageUrl,
                trip.TransactionCount,
                Math.Round(totalsByTrip.GetValueOrDefault(trip.Id, 0m), 2)))
            .ToList();

        return TypedResults.Ok(response);
    }
}
