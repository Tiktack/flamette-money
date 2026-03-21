using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Reports;

public sealed record ReportCategoryLookupItem(Guid Id, string Name, string Color, Guid? ParentId);
public sealed record ReportTripLookupItem(Guid Id, string Name);

public enum ReportInterval
{
    Auto = 0,
    None = 1,
    Day = 2,
    Week = 3,
    Month = 4,
}

public sealed record GetCategorySeriesReportQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    CategoryType Type = CategoryType.Expense,
    ReportInterval Interval = ReportInterval.Auto,
    Guid? TripId = null,
    bool GroupTripsAsCategory = false);

public sealed record ReportBucketResponse(string Key, string Label);

public sealed record ReportSeriesEntryResponse(
    string Key,
    string Label,
    string Color,
    decimal Total,
    decimal PercentageOfMax);

public sealed record ReportPointResponse(
    string BucketKey,
    string BucketLabel,
    Dictionary<string, decimal> Values,
    decimal Total);

public sealed record ReportSummaryResponse(
    decimal Total,
    decimal PreviousTotal,
    decimal AveragePerDay,
    decimal PreviousAveragePerDay,
    decimal AveragePerWeek,
    decimal PreviousAveragePerWeek,
    int DayCount,
    int BucketCount);

public sealed record CategorySeriesReportResponse(
    CategoryType Type,
    string BaseCurrency,
    ReportInterval Interval,
    DateTime? StartDate,
    DateTime? EndDate,
    List<ReportBucketResponse> Buckets,
    List<ReportSeriesEntryResponse> Series,
    List<ReportPointResponse> Data,
    ReportSummaryResponse Summary);

public sealed class GetCategorySeriesReportEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reports/category-series", Handle)
            .WithTags("Reports")
            .WithSummary("Get category series report")
            .WithDescription("Returns category split report for selected period and interval.")
            .Produces<CategorySeriesReportResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<CategorySeriesReportResponse>, ValidationProblem>> Handle(
        [AsParameters] GetCategorySeriesReportQuery query,
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

        if (query.StartDate is not null && query.EndDate is not null && query.StartDate > query.EndDate)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(query.StartDate)] = ["StartDate cannot be after EndDate."],
            });
        }

        var transactionsQuery = dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                Currency = transaction.Currency ?? transaction.Account.Currency,
                transaction.IsRefund,
                transaction.TripId,
                transaction.CategoryId,
                transaction.SubCategoryId,
            });

        if (query.StartDate is not null)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.Date >= query.StartDate.Value);
        }

        if (query.EndDate is not null)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.Date <= query.EndDate.Value);
        }

        if (query.TripId is not null)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.TripId == query.TripId.Value);
        }

        if (query.Type == CategoryType.Income)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.Type == TransactionType.Income);
        }
        else
        {
            transactionsQuery = transactionsQuery.Where(transaction =>
                transaction.Type == TransactionType.Expense ||
                transaction.Type == TransactionType.Refund ||
                transaction.IsRefund);
        }

        var categoryLookup = await dbContext.Categories
            .AsNoTracking()
            .ForUser(userId)
            .Select(category => new ReportCategoryLookupItem(
                category.Id,
                category.Name,
                category.Color,
                category.ParentId))
            .ToListAsync(cancellationToken);

        var shouldGroupTripsAsCategory = query.Type == CategoryType.Expense && query.GroupTripsAsCategory;
        var tripLookup = shouldGroupTripsAsCategory
            ? await dbContext.Trips
                .AsNoTracking()
                .ForUser(userId)
                .Select(trip => new ReportTripLookupItem(trip.Id, trip.Name))
                .ToListAsync(cancellationToken)
            : [];

        var transactions = await transactionsQuery
            .OrderBy(transaction => transaction.Date)
            .ToListAsync(cancellationToken);

        var categoryById = categoryLookup.ToDictionary(item => item.Id, item => item);
        var tripById = tripLookup.ToDictionary(item => item.Id, item => item);

        var startDate = query.StartDate;
        var endDate = query.EndDate;

        if (startDate is null && transactions.Count > 0)
        {
            startDate = transactions.First().Date.Date;
        }

        if (endDate is null && transactions.Count > 0)
        {
            endDate = transactions.Last().Date.Date;
        }

        if (startDate is null)
        {
            startDate = DateTime.UtcNow.Date;
        }

        if (endDate is null)
        {
            endDate = startDate.Value;
        }

        var resolvedInterval = ReportSeriesHelpers.ResolveInterval(startDate.Value, endDate.Value, query.Interval);
        var buckets = ReportSeriesHelpers.BuildBuckets(startDate.Value, endDate.Value, resolvedInterval);

        var bucketTotalsByCategory = new Dictionary<string, Dictionary<string, decimal>>();
        var totalsByCategory = new Dictionary<string, decimal>();

        foreach (var transaction in transactions)
        {
            var signedAmount = GetSignedAmount(query.Type, transaction.Type, transaction.Amount, transaction.IsRefund);
            if (signedAmount == 0)
            {
                continue;
            }

            var amount = ReportSeriesHelpers.TryConvertAmount(
                signedAmount,
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase);

            var categoryId = shouldGroupTripsAsCategory && transaction.TripId is Guid tripId
                ? $"trip:{tripId:D}"
                : ResolveTopLevelCategoryId(transaction.CategoryId, transaction.SubCategoryId, categoryById);
            var bucketKey = ReportSeriesHelpers.ResolveBucketKey(startDate.Value, transaction.Date, resolvedInterval);

            if (!bucketTotalsByCategory.TryGetValue(bucketKey, out var bucketMap))
            {
                bucketMap = new Dictionary<string, decimal>();
                bucketTotalsByCategory[bucketKey] = bucketMap;
            }

            if (!bucketMap.TryAdd(categoryId, amount))
            {
                bucketMap[categoryId] += amount;
            }

            if (!totalsByCategory.TryAdd(categoryId, amount))
            {
                totalsByCategory[categoryId] += amount;
            }
        }

        var orderedCategoryIds = totalsByCategory
            .Where(pair => pair.Value != 0)
            .OrderByDescending(pair => Math.Abs(pair.Value))
            .Select(pair => pair.Key)
            .ToList();

        var maxAbsAmount = orderedCategoryIds
            .Select(categoryId => Math.Abs(totalsByCategory[categoryId]))
            .DefaultIfEmpty(0m)
            .Max();

        var series = orderedCategoryIds
            .Select(categoryId =>
            {
                var label = "Uncategorized";
                var color = "gray.6";

                if (categoryId.StartsWith("trip:", StringComparison.OrdinalIgnoreCase))
                {
                    var rawTripId = categoryId[5..];
                    if (Guid.TryParse(rawTripId, out var parsedTripId) && tripById.TryGetValue(parsedTripId, out var trip))
                    {
                        label = trip.Name;
                        color = "grape.6";
                    }

                    var tripTotal = totalsByCategory[categoryId];
                    var tripPercentage = maxAbsAmount > 0 ? Math.Round((Math.Abs(tripTotal) / maxAbsAmount) * 100m, 2) : 0;

                    return new ReportSeriesEntryResponse(
                        categoryId,
                        label,
                        color,
                        Math.Round(tripTotal, 2),
                        tripPercentage);
                }

                if (categoryId != "uncategorized" && Guid.TryParse(categoryId, out var parsedId) && categoryById.TryGetValue(parsedId, out var category))
                {
                    label = category.Name;
                    color = category.Color;
                }

                var total = totalsByCategory[categoryId];
                var percentage = maxAbsAmount > 0 ? Math.Round((Math.Abs(total) / maxAbsAmount) * 100m, 2) : 0;

                return new ReportSeriesEntryResponse(
                    categoryId,
                    label,
                    color,
                    Math.Round(total, 2),
                    percentage);
            })
            .ToList();

        var data = buckets
            .Select(bucket =>
            {
                var values = new Dictionary<string, decimal>();
                foreach (var categoryId in orderedCategoryIds)
                {
                    values[categoryId] = 0;
                }

                if (bucketTotalsByCategory.TryGetValue(bucket.Key, out var bucketMap))
                {
                    foreach (var (key, value) in bucketMap)
                    {
                        values[key] = Math.Round(value, 2);
                    }
                }

                var total = values.Values.Sum();
                return new ReportPointResponse(
                    bucket.Key,
                    bucket.Label,
                    values,
                    Math.Round(total, 2));
            })
            .ToList();

        var reportTotal = Math.Round(totalsByCategory.Values.Sum(), 2);
        var dayCount = Math.Max(1, (endDate.Value.Date - startDate.Value.Date).Days + 1);
        var weekCount = Math.Max(1m, dayCount / 7m);

        var previousRangeEnd = startDate.Value.Date.AddDays(-1);
        var elapsedEnd = endDate.Value.Date < DateTime.UtcNow.Date
            ? endDate.Value.Date
            : DateTime.UtcNow.Date;
        var elapsedDayCount = Math.Clamp((elapsedEnd - startDate.Value.Date).Days + 1, 1, dayCount);

        var previousTotalStart = previousRangeEnd.AddDays(-(elapsedDayCount - 1));
        var previousFullStart = previousRangeEnd.AddDays(-(dayCount - 1));
        var previousEndOfDay = previousRangeEnd.Date.AddDays(1).AddTicks(-1);

        var previousTransactions = await dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Where(transaction =>
                transaction.Date >= previousFullStart &&
                transaction.Date <= previousEndOfDay)
            .Where(transaction => query.TripId == null || transaction.TripId == query.TripId.Value)
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                Currency = transaction.Currency ?? transaction.Account.Currency,
                transaction.IsRefund,
            })
            .ToListAsync(cancellationToken);

        var previousFullTotal = Math.Round(previousTransactions
            .Select(transaction => ReportSeriesHelpers.TryConvertAmount(
                GetSignedAmount(query.Type, transaction.Type, transaction.Amount, transaction.IsRefund),
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase))
            .Sum(), 2);

        var previousTotal = Math.Round(previousTransactions
            .Where(transaction => transaction.Date >= previousTotalStart)
            .Select(transaction => ReportSeriesHelpers.TryConvertAmount(
                GetSignedAmount(query.Type, transaction.Type, transaction.Amount, transaction.IsRefund),
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase))
            .Sum(), 2);

        var previousFullWeekCount = Math.Max(1m, dayCount / 7m);

        var summary = new ReportSummaryResponse(
            reportTotal,
            previousTotal,
            Math.Round(reportTotal / dayCount, 2),
            Math.Round(previousFullTotal / dayCount, 2),
            Math.Round(reportTotal / weekCount, 2),
            Math.Round(previousFullTotal / previousFullWeekCount, 2),
            dayCount,
            buckets.Count);

        var response = new CategorySeriesReportResponse(
            query.Type,
            baseCurrency,
            resolvedInterval,
            startDate,
            endDate,
            buckets,
            series,
            data,
            summary);

        return TypedResults.Ok(response);
    }

    private static decimal GetSignedAmount(CategoryType type, TransactionType transactionType, decimal amount, bool isRefund)
    {
        if (type == CategoryType.Income)
        {
            return transactionType == TransactionType.Income ? amount : 0;
        }

        if (transactionType == TransactionType.Expense)
        {
            return amount;
        }

        if (transactionType == TransactionType.Refund || isRefund)
        {
            return -amount;
        }

        return 0;
    }

    private static string ResolveTopLevelCategoryId(
        Guid? categoryId,
        Guid? subCategoryId,
        Dictionary<Guid, ReportCategoryLookupItem> categoryById)
    {
        if (subCategoryId is not null && categoryById.TryGetValue(subCategoryId.Value, out var subCategory))
        {
            if (subCategory.ParentId is Guid parentId)
            {
                return parentId.ToString();
            }

            return subCategoryId.Value.ToString();
        }

        if (categoryId is not null)
        {
            return categoryId.Value.ToString();
        }

        return "uncategorized";
    }

}
