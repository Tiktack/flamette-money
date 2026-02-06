using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record GetTransactionResponse(
    Guid Id,
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    bool IsRefund,
    string? Note,
    string? MerchantName,
    string? Location);

public sealed class GetTransactionEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/transactions/{id:guid}", Handle)
            .WithTags("Transactions")
            .WithSummary("Get transaction")
            .WithDescription("Get a transaction by id.")
            .Produces<GetTransactionResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Results<Ok<GetTransactionResponse>, NotFound>> Handle(
        [FromRoute] Guid id,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var transaction = await dbContext.Transactions
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (transaction is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new GetTransactionResponse(
            transaction.Id,
            transaction.Date,
            transaction.Type,
            transaction.Amount,
            transaction.AccountId,
            transaction.CategoryId,
            transaction.SubCategoryId,
            transaction.TargetAccountId,
            transaction.OriginalTransactionId,
            transaction.IsRefund,
            transaction.Note,
            transaction.MerchantName,
            transaction.Location));
    }
}
