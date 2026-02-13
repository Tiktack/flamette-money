using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record TransactionItemResponse(
    Guid Id,
    string Name,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal PromotionAmount,
    decimal FinalAmount,
    Guid? CategoryId,
    Guid? SubCategoryId);

public record GetTransactionResponse(
    Guid Id,
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid? TripId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    bool IsRefund,
    string? Note,
    string? MerchantName,
    string? Location,
    List<TransactionItemResponse> Items);

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
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var transaction = await dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Include(t => t.Items)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (transaction is null)
        {
            return TypedResults.NotFound();
        }

        var items = transaction.Items.Select(i => new TransactionItemResponse(
            i.Id, i.Name, i.Quantity, i.Unit, i.UnitPrice,
            i.PromotionAmount, i.FinalAmount, i.CategoryId, i.SubCategoryId)).ToList();

        return TypedResults.Ok(new GetTransactionResponse(
            transaction.Id,
            transaction.Date,
            transaction.Type,
            transaction.Amount,
            transaction.AccountId,
            transaction.TripId,
            transaction.CategoryId,
            transaction.SubCategoryId,
            transaction.TargetAccountId,
            transaction.OriginalTransactionId,
            transaction.IsRefund,
            transaction.Note,
            transaction.MerchantName,
            transaction.Location,
            items));
    }
}
