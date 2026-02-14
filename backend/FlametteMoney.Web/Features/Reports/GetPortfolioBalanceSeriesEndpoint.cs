using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Reports;

public sealed record GetPortfolioBalanceSeriesQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    ReportInterval Interval = ReportInterval.Auto,
    string BaseCurrency = "USD",
    Guid[]? AccountIds = null);

public sealed record PortfolioAccountResponse(
    Guid Id,
    string Name,
    string Color,
    string Currency,
    decimal InitialBalance,
    decimal CurrentBalance);

public sealed record PortfolioBalancePointResponse(
    string BucketKey,
    string BucketLabel,
    DateTime BucketDate,
    decimal TotalBalance,
    Dictionary<string, decimal> AccountBalances,
    Dictionary<string, decimal> TotalsByCurrency,
    List<string> MissingCurrencies);

public sealed record PortfolioBalanceSummaryResponse(
    decimal StartBalance,
    decimal EndBalance,
    decimal Delta,
    decimal DeltaPercent,
    int PointCount,
    int DayCount);

public sealed record PortfolioBalanceSeriesResponse(
    string BaseCurrency,
    DateTime StartDate,
    DateTime EndDate,
    ReportInterval Interval,
    List<PortfolioAccountResponse> Accounts,
    List<PortfolioBalancePointResponse> Points,
    PortfolioBalanceSummaryResponse Summary,
    List<string> Warnings);

internal sealed record PortfolioBucket(DateTime Start, DateTime End, string Key, string Label);

public sealed class GetPortfolioBalanceSeriesEndpoint : ICarterModule
{
    private static readonly Dictionary<string, decimal> SeedUsdRates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["USD"] = 1m,
        ["EUR"] = 1.08m,
        ["GBP"] = 1.27m,
        ["CAD"] = 0.74m,
        ["AUD"] = 0.66m,
        ["NZD"] = 0.61m,
        ["JPY"] = 0.0068m,
        ["CNY"] = 0.14m,
        ["CHF"] = 1.11m,
        ["SEK"] = 0.094m,
        ["NOK"] = 0.094m,
        ["DKK"] = 0.15m,
        ["PLN"] = 0.26m,
        ["CZK"] = 0.043m,
        ["HUF"] = 0.0028m,
        ["RON"] = 0.22m,
        ["UAH"] = 0.024m,
        ["INR"] = 0.012m,
        ["AED"] = 0.27m,
        ["SGD"] = 0.74m,
        ["HKD"] = 0.13m,
    };

    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reports/portfolio-balance-series", Handle)
            .WithTags("Reports")
            .WithSummary("Get portfolio balance series")
            .WithDescription("Returns portfolio balance time-series converted to a selected base currency.")
            .Produces<PortfolioBalanceSeriesResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<PortfolioBalanceSeriesResponse>, ValidationProblem>> Handle(
        [AsParameters] GetPortfolioBalanceSeriesQuery query,
        [FromServices] ICurrentUserContext currentUserContext,
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

        var baseCurrency = NormalizeCurrency(query.BaseCurrency);
        if (baseCurrency.Length != 3)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(query.BaseCurrency)] = ["BaseCurrency must be a 3-letter code."],
            });
        }

        var userId = currentUserContext.GetScopedUserId();

        var accountsQuery = dbContext.Accounts
            .AsNoTracking()
            .ForUser(userId);

        if (query.AccountIds is { Length: > 0 })
        {
            accountsQuery = accountsQuery.Where(account => query.AccountIds.Contains(account.Id));
        }

        var accounts = await accountsQuery
            .OrderBy(account => account.Name)
            .Select(account => new PortfolioAccountResponse(
                account.Id,
                account.Name,
                account.Color,
                NormalizeCurrency(account.Currency),
                account.InitialBalance,
                account.CurrentBalance))
            .ToListAsync(cancellationToken);

        if (accounts.Count == 0)
        {
            var today = DateTime.UtcNow.Date;
            return TypedResults.Ok(new PortfolioBalanceSeriesResponse(
                baseCurrency,
                today,
                today,
                ReportInterval.Day,
                [],
                [],
                new PortfolioBalanceSummaryResponse(0, 0, 0, 0, 0, 1),
                []));
        }

        var startDate = query.StartDate?.Date ?? DateTime.UtcNow.Date.AddMonths(-6);
        var endDate = query.EndDate?.Date ?? DateTime.UtcNow.Date;

        var resolvedInterval = ResolveInterval(startDate, endDate, query.Interval);
        var buckets = BuildBuckets(startDate, endDate, resolvedInterval);

        var accountIdSet = accounts.Select(account => account.Id).ToHashSet();

        var transactions = await dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Where(transaction =>
                transaction.Date <= endDate.AddDays(1).AddTicks(-1) &&
                (accountIdSet.Contains(transaction.AccountId) ||
                 (transaction.TargetAccountId != null && accountIdSet.Contains(transaction.TargetAccountId.Value))))
            .OrderBy(transaction => transaction.Date)
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                transaction.Amount2,
                transaction.AccountId,
                transaction.TargetAccountId,
            })
            .ToListAsync(cancellationToken);

        var accountBalances = accounts.ToDictionary(account => account.Id, account => account.InitialBalance);
        var accountCurrency = accounts.ToDictionary(account => account.Id, account => account.Currency);

        var points = new List<PortfolioBalancePointResponse>(buckets.Count);
        var warnings = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var transactionIndex = 0;
        foreach (var bucket in buckets)
        {
            while (transactionIndex < transactions.Count && transactions[transactionIndex].Date <= bucket.End)
            {
                ApplyBalanceDelta(accountBalances, transactions[transactionIndex]);
                transactionIndex++;
            }

            var totalsByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            var accountBalancesInBase = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            var missingCurrencies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            decimal totalInBase = 0;

            foreach (var (accountId, balance) in accountBalances)
            {
                if (!accountCurrency.TryGetValue(accountId, out var currency))
                {
                    continue;
                }

                if (!totalsByCurrency.TryAdd(currency, Math.Round(balance, 2)))
                {
                    totalsByCurrency[currency] = Math.Round(totalsByCurrency[currency] + balance, 2);
                }

                var rate = TryResolveToBaseRate(currency, baseCurrency);
                if (rate is null)
                {
                    missingCurrencies.Add(currency);
                    warnings.Add($"No FX rate for {currency}->{baseCurrency}; excluded from total balance.");
                    continue;
                }

                var converted = Math.Round(balance * rate.Value, 2);
                accountBalancesInBase[accountId.ToString()] = converted;
                totalInBase += converted;
            }

            points.Add(new PortfolioBalancePointResponse(
                bucket.Key,
                bucket.Label,
                bucket.End,
                Math.Round(totalInBase, 2),
                accountBalancesInBase,
                totalsByCurrency,
                missingCurrencies.OrderBy(value => value).ToList()));
        }

        var startBalance = points.FirstOrDefault()?.TotalBalance ?? 0;
        var endBalance = points.LastOrDefault()?.TotalBalance ?? 0;
        var delta = Math.Round(endBalance - startBalance, 2);
        var deltaPercent = startBalance == 0
            ? (endBalance == 0 ? 0 : 100)
            : Math.Round((delta / Math.Abs(startBalance)) * 100m, 2);
        var dayCount = Math.Max(1, (endDate - startDate).Days + 1);

        var response = new PortfolioBalanceSeriesResponse(
            baseCurrency,
            startDate,
            endDate,
            resolvedInterval,
            accounts,
            points,
            new PortfolioBalanceSummaryResponse(
                startBalance,
                endBalance,
                delta,
                deltaPercent,
                points.Count,
                dayCount),
            warnings.OrderBy(value => value).ToList());

        return TypedResults.Ok(response);
    }

    private static void ApplyBalanceDelta(
        Dictionary<Guid, decimal> accountBalances,
        dynamic transaction)
    {
        var sourceId = (Guid)transaction.AccountId;
        var targetId = (Guid?)transaction.TargetAccountId;
        var amount = (decimal)transaction.Amount;
        var amount2 = (decimal?)transaction.Amount2;
        var type = (TransactionType)transaction.Type;

        if (type == TransactionType.Expense)
        {
            if (accountBalances.ContainsKey(sourceId))
            {
                accountBalances[sourceId] -= amount;
            }

            return;
        }

        if (type == TransactionType.Income || type == TransactionType.Refund)
        {
            if (accountBalances.ContainsKey(sourceId))
            {
                accountBalances[sourceId] += amount;
            }

            return;
        }

        if (type != TransactionType.Transfer)
        {
            return;
        }

        if (accountBalances.ContainsKey(sourceId))
        {
            accountBalances[sourceId] -= amount;
        }

        if (targetId is Guid resolvedTargetId && accountBalances.ContainsKey(resolvedTargetId))
        {
            accountBalances[resolvedTargetId] += amount2 ?? amount;
        }
    }

    private static decimal? TryResolveToBaseRate(string currency, string baseCurrency)
    {
        if (currency.Equals(baseCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return 1m;
        }

        if (!SeedUsdRates.TryGetValue(currency, out var currencyToUsd))
        {
            return null;
        }

        if (!SeedUsdRates.TryGetValue(baseCurrency, out var baseToUsd))
        {
            return null;
        }

        return currencyToUsd / baseToUsd;
    }

    private static ReportInterval ResolveInterval(DateTime startDate, DateTime endDate, ReportInterval requested)
    {
        if (requested != ReportInterval.Auto)
        {
            return requested;
        }

        var isSameMonth = startDate.Year == endDate.Year && startDate.Month == endDate.Month;
        if (isSameMonth)
        {
            return ReportInterval.Day;
        }

        var monthSpan = ((endDate.Year - startDate.Year) * 12) + endDate.Month - startDate.Month;
        if (monthSpan > 6)
        {
            return ReportInterval.Month;
        }

        var daySpan = (endDate.Date - startDate.Date).Days + 1;
        if (daySpan > 45)
        {
            return ReportInterval.Week;
        }

        return ReportInterval.Day;
    }

    private static List<PortfolioBucket> BuildBuckets(DateTime startDate, DateTime endDate, ReportInterval interval)
    {
        var buckets = new List<PortfolioBucket>();

        if (interval == ReportInterval.None)
        {
            buckets.Add(new PortfolioBucket(
                startDate.Date,
                endDate.Date.AddDays(1).AddTicks(-1),
                "all",
                "All"));
            return buckets;
        }

        if (interval == ReportInterval.Day)
        {
            var singleMonth = startDate.Year == endDate.Year && startDate.Month == endDate.Month;
            for (var cursor = startDate.Date; cursor <= endDate.Date; cursor = cursor.AddDays(1))
            {
                var key = cursor.ToString("yyyy-MM-dd");
                var label = singleMonth ? cursor.Day.ToString() : cursor.ToString("MMM d");
                buckets.Add(new PortfolioBucket(
                    cursor,
                    cursor.AddDays(1).AddTicks(-1),
                    key,
                    label));
            }

            return buckets;
        }

        if (interval == ReportInterval.Week)
        {
            for (var cursor = startDate.Date; cursor <= endDate.Date; cursor = cursor.AddDays(7))
            {
                var bucketEnd = cursor.AddDays(6);
                if (bucketEnd > endDate.Date)
                {
                    bucketEnd = endDate.Date;
                }

                buckets.Add(new PortfolioBucket(
                    cursor,
                    bucketEnd.AddDays(1).AddTicks(-1),
                    cursor.ToString("yyyy-MM-dd"),
                    cursor.ToString("MMM d")));
            }

            return buckets;
        }

        var monthCursor = new DateTime(startDate.Year, startDate.Month, 1);
        var lastMonth = new DateTime(endDate.Year, endDate.Month, 1);
        var showYear = monthCursor.Year != lastMonth.Year;

        while (monthCursor <= lastMonth)
        {
            var monthEnd = monthCursor.AddMonths(1).AddDays(-1);
            if (monthEnd > endDate.Date)
            {
                monthEnd = endDate.Date;
            }

            var key = monthCursor.ToString("yyyy-MM");
            var label = showYear ? monthCursor.ToString("MMM yy") : monthCursor.ToString("MMM");

            buckets.Add(new PortfolioBucket(
                monthCursor,
                monthEnd.AddDays(1).AddTicks(-1),
                key,
                label));

            monthCursor = monthCursor.AddMonths(1);
        }

        return buckets;
    }

    private static string NormalizeCurrency(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return "USD";
        }

        return currency.Trim().ToUpperInvariant();
    }
}