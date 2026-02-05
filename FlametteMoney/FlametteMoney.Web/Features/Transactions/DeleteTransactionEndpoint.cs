using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public sealed class DeleteTransactionEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/transactions/{id:guid}", Handle)
            .WithTags("Transactions")
            .WithSummary("Delete transaction")
            .WithDescription("Delete a transaction and revert account balance changes.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Results<NoContent, NotFound>> Handle(
        [FromRoute] Guid id,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var transaction = await dbContext.Transactions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (transaction is null)
        {
            return TypedResults.NotFound();
        }

        var account = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == transaction.AccountId, cancellationToken);
        if (account is null)
        {
            return TypedResults.NotFound();
        }

        RevertBalance(account, transaction.Type, transaction.Amount);
        dbContext.Transactions.Remove(transaction);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }

    private static void RevertBalance(Account account, TransactionType type, decimal amount)
    {
        account.CurrentBalance = type == TransactionType.Expense
            ? account.CurrentBalance + amount
            : account.CurrentBalance - amount;
    }
}
