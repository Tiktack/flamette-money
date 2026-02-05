using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public sealed class DeleteAccountEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/accounts/{id:guid}", Handle)
            .WithTags("Accounts")
            .WithSummary("Delete account")
            .WithDescription("Delete account if no transactions exist.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);
    }

    private static async Task<Results<NoContent, NotFound, Conflict>> Handle(
        [FromRoute] Guid id,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (account is null)
        {
            return TypedResults.NotFound();
        }

        var hasTransactions = await dbContext.Transactions.AnyAsync(item => item.AccountId == id, cancellationToken);
        if (hasTransactions)
        {
            return TypedResults.Conflict();
        }

        dbContext.Accounts.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }
}
