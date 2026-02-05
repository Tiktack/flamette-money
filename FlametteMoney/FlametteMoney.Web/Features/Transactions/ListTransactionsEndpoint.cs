using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record TransactionListItemResponse(
    Guid Id,
    DateTimeOffset Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid CategoryId,
    Guid? SubCategoryId,
    string? Note);

public sealed class ListTransactionsEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/transactions", Handle)
            .WithTags("Transactions")
            .WithSummary("List transactions")
            .WithDescription("List transactions sorted by date descending.")
            .Produces<IEnumerable<TransactionListItemResponse>>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<List<TransactionListItemResponse>>> Handle(
        [FromQuery] int page,
        [FromQuery] int pageSize,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var currentPage = page <= 0 ? 1 : page;
        var currentSize = pageSize is <= 0 or > 200 ? 25 : pageSize;

        var transactions = await dbContext.Transactions
            .AsNoTracking()
            .OrderByDescending(transaction => transaction.Date)
            .Skip((currentPage - 1) * currentSize)
            .Take(currentSize)
            .Select(transaction => new TransactionListItemResponse(
                transaction.Id,
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                transaction.AccountId,
                transaction.CategoryId,
                transaction.SubCategoryId,
                transaction.Note))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(transactions);
    }
}
