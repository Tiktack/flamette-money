using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public sealed record SearchTransactionsQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    Guid[]? AccountIds,
    Guid[]? TripIds,
    Guid[]? CategoryIds,
    TransactionType[]? Types,
    string? SearchText,
    decimal? MinAmount,
    decimal? MaxAmount);

public sealed class SearchTransactionsEndpoint : ICarterModule
{
    /// <summary>Maps transaction search endpoints.</summary>
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/transactions/search", Handle)
            .WithTags("Transactions")
            .WithSummary("Search transactions")
            .WithDescription("Search transactions with advanced filters.")
            .Produces<IEnumerable<TransactionListItemResponse>>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<List<TransactionListItemResponse>>> Handle(
        [AsParameters] SearchTransactionsQuery query,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();
        var transactions = dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId);

        if (query.StartDate is not null)
        {
            var startDate = query.StartDate.Value;
            transactions = transactions.Where(transaction => transaction.Date >= startDate);
        }

        if (query.EndDate is not null)
        {
            var endDate = query.EndDate.Value;
            transactions = transactions.Where(transaction => transaction.Date <= endDate);
        }

        if (query.AccountIds is { Length: > 0 })
        {
            var accountIds = query.AccountIds;
            transactions = transactions.Where(transaction =>
                accountIds.Contains(transaction.AccountId) ||
                (transaction.TargetAccountId != null && accountIds.Contains(transaction.TargetAccountId.Value)));
        }

        if (query.CategoryIds is { Length: > 0 })
        {
            var categoryIds = query.CategoryIds;
            transactions = transactions.Where(transaction =>
                transaction.CategoryId != null && categoryIds.Contains(transaction.CategoryId.Value));
        }

        if (query.TripIds is { Length: > 0 })
        {
            var tripIds = query.TripIds;
            transactions = transactions.Where(transaction =>
                transaction.TripId != null && tripIds.Contains(transaction.TripId.Value));
        }

        if (query.Types is { Length: > 0 })
        {
            var types = query.Types;
            transactions = transactions.Where(transaction => types.Contains(transaction.Type));
        }

        if (!string.IsNullOrWhiteSpace(query.SearchText))
        {
            var search = $"%{query.SearchText.Trim()}%";
            transactions = transactions.Where(transaction =>
                (transaction.Note != null && EF.Functions.Like(transaction.Note, search)) ||
                (transaction.MerchantName != null && EF.Functions.Like(transaction.MerchantName, search)));
        }

        if (query.MinAmount is not null)
        {
            var minAmount = query.MinAmount.Value;
            transactions = transactions.Where(transaction => transaction.Amount >= minAmount);
        }

        if (query.MaxAmount is not null)
        {
            var maxAmount = query.MaxAmount.Value;
            transactions = transactions.Where(transaction => transaction.Amount <= maxAmount);
        }

        var results = await transactions
            .OrderByDescending(transaction => transaction.Date)
            .Select(transaction => new TransactionListItemResponse(
                transaction.Id,
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                transaction.Amount2,
                transaction.Currency,
                transaction.Currency2,
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
                transaction.Items.Count))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(results);
    }
}
