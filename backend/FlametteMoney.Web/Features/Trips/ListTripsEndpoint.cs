using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
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
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var trips = await dbContext.Trips
            .AsNoTracking()
            .ForUser(userId)
            .OrderBy(trip => trip.StartDate == null)
            .ThenByDescending(trip => trip.StartDate)
            .ThenBy(trip => trip.Name)
            .Select(trip => new TripListItemResponse(
                trip.Id,
                trip.Name,
                trip.StartDate,
                trip.EndDate,
                trip.ImageUrl,
                trip.Transactions.Count(transaction => transaction.Type == TransactionType.Expense),
                trip.Transactions
                    .Where(transaction => transaction.Type == TransactionType.Expense)
                    .Sum(transaction => (decimal?)transaction.Amount) ?? 0m))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(trips);
    }
}
