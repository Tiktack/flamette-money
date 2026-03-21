using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Reports;

public sealed record GetCashflowSeriesReportQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    ReportInterval Interval = ReportInterval.Auto);

public sealed record CashflowSeriesPointResponse(
    string BucketKey,
    string BucketLabel,
    decimal Income,
    decimal Spending,
    decimal Net);

public sealed record CashflowMetricSummaryResponse(
    decimal Total,
    decimal PreviousTotal,
    decimal AveragePerDay,
    decimal PreviousAveragePerDay);

public sealed record CashflowBucketHighlightResponse(
    string BucketKey,
    string BucketLabel,
    decimal Income,
    decimal Spending,
    decimal Net);

public sealed record CashflowSummaryResponse(
    CashflowMetricSummaryResponse Income,
    CashflowMetricSummaryResponse Spending,
    CashflowMetricSummaryResponse Net,
    decimal SavingsRate,
    decimal PreviousSavingsRate,
    int PositiveBucketCount,
    int NegativeBucketCount,
    CashflowBucketHighlightResponse? BestBucket,
    CashflowBucketHighlightResponse? WorstBucket,
    int DayCount,
    int BucketCount);

public sealed record CashflowSeriesReportResponse(
    string BaseCurrency,
    ReportInterval Interval,
    DateTime StartDate,
    DateTime EndDate,
    List<ReportBucketResponse> Buckets,
    List<CashflowSeriesPointResponse> Data,
    CashflowSummaryResponse Summary);

internal sealed class CashflowBucketAccumulator
{
    public decimal Income { get; set; }

    public decimal Spending { get; set; }
}

public sealed class GetCashflowSeriesReportEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reports/cashflow-series", Handle)
            .WithTags("Reports")
            .WithSummary("Get cashflow series report")
            .WithDescription("Returns spendings, income, and net cashflow for the selected period and interval.")
            .Produces<CashflowSeriesReportResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<CashflowSeriesReportResponse>, ValidationProblem>> Handle(
        [AsParameters] GetCashflowSeriesReportQuery query,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] IExchangeRateService exchangeRateService,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (query.StartDate is not null && query.EndDate is not null && query.StartDate > query.EndDate)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(query.StartDate)] = ["StartDate cannot be after EndDate."],
            });
        }

        var userId = currentUserContext.GetScopedUserId();
        var userBaseCurrency = await dbContext.Users
            .AsNoTracking()
            .Where(item => item.Id == userId)
            .Select(item => item.BaseCurrency)
            .FirstOrDefaultAsync(cancellationToken);
        var baseCurrency = SupportedCurrencies.NormalizeOrDefault(userBaseCurrency, "USD");
        var fxSnapshot = await exchangeRateService.GetRatesToBaseAsync(baseCurrency, cancellationToken);

        var currentTransactionsQuery = dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                Currency = transaction.Currency ?? transaction.Account.Currency,
                transaction.IsRefund,
            });

        if (query.StartDate is not null)
        {
            currentTransactionsQuery = currentTransactionsQuery.Where(transaction => transaction.Date >= query.StartDate.Value);
        }

        if (query.EndDate is not null)
        {
            currentTransactionsQuery = currentTransactionsQuery.Where(transaction => transaction.Date <= query.EndDate.Value);
        }

        currentTransactionsQuery = currentTransactionsQuery.Where(transaction =>
            transaction.Type == TransactionType.Income ||
            transaction.Type == TransactionType.Expense ||
            transaction.Type == TransactionType.Refund ||
            transaction.IsRefund);

        var currentTransactions = await currentTransactionsQuery
            .OrderBy(transaction => transaction.Date)
            .ToListAsync(cancellationToken);

        var startDate = query.StartDate?.Date;
        var endDate = query.EndDate?.Date;

        if (startDate is null && currentTransactions.Count > 0)
        {
            startDate = currentTransactions.First().Date.Date;
        }

        if (endDate is null && currentTransactions.Count > 0)
        {
            endDate = currentTransactions.Last().Date.Date;
        }

        startDate ??= DateTime.UtcNow.Date;
        endDate ??= startDate.Value;

        var resolvedInterval = ReportSeriesHelpers.ResolveInterval(startDate.Value, endDate.Value, query.Interval);
        var buckets = ReportSeriesHelpers.BuildBuckets(startDate.Value, endDate.Value, resolvedInterval);
        var bucketTotals = new Dictionary<string, CashflowBucketAccumulator>(StringComparer.OrdinalIgnoreCase);
        decimal totalIncome = 0;
        decimal totalSpending = 0;

        foreach (var transaction in currentTransactions)
        {
            var incomeAmount = GetIncomeAmount(transaction.Type, transaction.Amount);
            var spendingAmount = GetSpendingAmount(transaction.Type, transaction.Amount, transaction.IsRefund);

            if (incomeAmount == 0 && spendingAmount == 0)
            {
                continue;
            }

            var convertedIncome = ReportSeriesHelpers.TryConvertAmount(
                incomeAmount,
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase);
            var convertedSpending = ReportSeriesHelpers.TryConvertAmount(
                spendingAmount,
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase);

            var bucketKey = ReportSeriesHelpers.ResolveBucketKey(startDate.Value, transaction.Date, resolvedInterval);
            if (!bucketTotals.TryGetValue(bucketKey, out var bucket))
            {
                bucket = new CashflowBucketAccumulator();
                bucketTotals[bucketKey] = bucket;
            }

            bucket.Income += convertedIncome;
            bucket.Spending += convertedSpending;
            totalIncome += convertedIncome;
            totalSpending += convertedSpending;
        }

        var data = buckets
            .Select(bucket =>
            {
                bucketTotals.TryGetValue(bucket.Key, out var totals);

                var income = Math.Round(totals?.Income ?? 0m, 2);
                var spending = Math.Round(totals?.Spending ?? 0m, 2);
                var net = Math.Round(income - spending, 2);

                return new CashflowSeriesPointResponse(
                    bucket.Key,
                    bucket.Label,
                    income,
                    spending,
                    net);
            })
            .ToList();

        var dayCount = Math.Max(1, (endDate.Value.Date - startDate.Value.Date).Days + 1);
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
                transaction.Date <= previousEndOfDay &&
                (transaction.Type == TransactionType.Income ||
                 transaction.Type == TransactionType.Expense ||
                 transaction.Type == TransactionType.Refund ||
                 transaction.IsRefund))
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                Currency = transaction.Currency ?? transaction.Account.Currency,
                transaction.IsRefund,
            })
            .ToListAsync(cancellationToken);

        decimal previousFullIncome = 0;
        decimal previousFullSpending = 0;
        decimal previousTotalIncome = 0;
        decimal previousTotalSpending = 0;

        foreach (var transaction in previousTransactions)
        {
            var incomeAmount = GetIncomeAmount(transaction.Type, transaction.Amount);
            var spendingAmount = GetSpendingAmount(transaction.Type, transaction.Amount, transaction.IsRefund);

            if (incomeAmount == 0 && spendingAmount == 0)
            {
                continue;
            }

            var convertedIncome = ReportSeriesHelpers.TryConvertAmount(
                incomeAmount,
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase);
            var convertedSpending = ReportSeriesHelpers.TryConvertAmount(
                spendingAmount,
                transaction.Currency,
                baseCurrency,
                fxSnapshot.RatesToBase);

            previousFullIncome += convertedIncome;
            previousFullSpending += convertedSpending;

            if (transaction.Date >= previousTotalStart)
            {
                previousTotalIncome += convertedIncome;
                previousTotalSpending += convertedSpending;
            }
        }

        var totalNet = Math.Round(totalIncome - totalSpending, 2);
        var previousTotalNet = Math.Round(previousTotalIncome - previousTotalSpending, 2);
        var bestBucket = data.OrderByDescending(point => point.Net).FirstOrDefault();
        var worstBucket = data.OrderBy(point => point.Net).FirstOrDefault();

        var summary = new CashflowSummaryResponse(
            new CashflowMetricSummaryResponse(
                Math.Round(totalIncome, 2),
                Math.Round(previousTotalIncome, 2),
                Math.Round(totalIncome / dayCount, 2),
                Math.Round(previousFullIncome / dayCount, 2)),
            new CashflowMetricSummaryResponse(
                Math.Round(totalSpending, 2),
                Math.Round(previousTotalSpending, 2),
                Math.Round(totalSpending / dayCount, 2),
                Math.Round(previousFullSpending / dayCount, 2)),
            new CashflowMetricSummaryResponse(
                totalNet,
                previousTotalNet,
                Math.Round(totalNet / dayCount, 2),
                Math.Round((previousFullIncome - previousFullSpending) / dayCount, 2)),
            CalculateSavingsRate(totalIncome, totalNet),
            CalculateSavingsRate(previousTotalIncome, previousTotalNet),
            data.Count(point => point.Net > 0),
            data.Count(point => point.Net < 0),
            bestBucket is null
                ? null
                : new CashflowBucketHighlightResponse(
                    bestBucket.BucketKey,
                    bestBucket.BucketLabel,
                    bestBucket.Income,
                    bestBucket.Spending,
                    bestBucket.Net),
            worstBucket is null
                ? null
                : new CashflowBucketHighlightResponse(
                    worstBucket.BucketKey,
                    worstBucket.BucketLabel,
                    worstBucket.Income,
                    worstBucket.Spending,
                    worstBucket.Net),
            dayCount,
            buckets.Count);

        var response = new CashflowSeriesReportResponse(
            baseCurrency,
            resolvedInterval,
            startDate.Value,
            endDate.Value,
            buckets,
            data,
            summary);

        return TypedResults.Ok(response);
    }

    private static decimal GetIncomeAmount(TransactionType transactionType, decimal amount)
    {
        return transactionType == TransactionType.Income ? amount : 0m;
    }

    private static decimal GetSpendingAmount(TransactionType transactionType, decimal amount, bool isRefund)
    {
        if (transactionType == TransactionType.Expense)
        {
            return amount;
        }

        if (transactionType == TransactionType.Refund || isRefund)
        {
            return -amount;
        }

        return 0m;
    }

    private static decimal CalculateSavingsRate(decimal income, decimal net)
    {
        if (income <= 0)
        {
            return 0m;
        }

        return Math.Round((net / income) * 100m, 2);
    }
}