using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Seeding;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FlametteMoney.Web.Features.Seed;

public sealed record SeedDemoRequest(int? Years, int? Seed);

public sealed record SeedDemoResponse(
    int AccountsAdded,
    int TransactionsAdded,
    int TransfersAdded,
    int RefundsAdded,
    DateTime StartDate,
    DateTime EndDate);

public sealed class SeedDemoEndpoint : ICarterModule
{
    /// <summary>Maps demo data seeding endpoints.</summary>
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/seed/demo", Handle)
            .WithTags("Seed")
            .WithSummary("Seed demo data")
            .WithDescription("Seed demo accounts and transactions for development.")
            .Produces<SeedDemoResponse>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<SeedDemoResponse>> Handle(
        [AsParameters] SeedDemoRequest request,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (currentUserContext.UserId is Guid userId)
        {
            await UserCategoryBootstrapper.EnsureForUserAsync(dbContext, userId, cancellationToken);
        }

        var years = request.Years ?? 3;
        var seedOptions = new SeedOptions(years, request.Seed);
        var generator = new SeedDataGenerator();

        var result = await generator.SeedDemoAsync(dbContext, seedOptions, cancellationToken);

        return TypedResults.Ok(new SeedDemoResponse(
            result.AccountsAdded,
            result.TransactionsAdded,
            result.TransfersAdded,
            result.RefundsAdded,
            result.StartDate,
            result.EndDate));
    }
}
