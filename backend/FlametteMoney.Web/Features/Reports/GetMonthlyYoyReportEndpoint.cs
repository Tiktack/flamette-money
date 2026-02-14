using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Reports;

public sealed record GetMonthlyYoyReportQuery(
    int? StartYear,
    int? EndYear,
    CategoryType Type = CategoryType.Expense,
    Guid? TripId = null);

public sealed record MonthlyYoySeriesResponse(
    string Key,
    string Label,
    int Year,
    string Color,
    decimal Total);

public sealed record MonthlyYoyPointResponse(
    int Month,
    string MonthLabel,
    Dictionary<string, decimal> Values,
    decimal Total);

public sealed record MonthlyYoyYearTotalResponse(int Year, decimal Total);

public sealed record MonthlyYoySummaryResponse(
    decimal Total,
    decimal PreviousYearTotal,
    decimal AveragePerMonth,
    int YearCount);

public sealed record MonthlyYoyReportResponse(
    CategoryType Type,
    int StartYear,
    int EndYear,
    List<string> Months,
    List<MonthlyYoySeriesResponse> Series,
    List<MonthlyYoyPointResponse> Data,
    List<MonthlyYoyYearTotalResponse> YearTotals,
    MonthlyYoySummaryResponse Summary);

public sealed class GetMonthlyYoyReportEndpoint : ICarterModule
{
    private static readonly string[] MonthLabels =
    [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    private static readonly string[] YearColors =
    [
        "blue.6",
        "teal.6",
        "grape.6",
        "orange.6",
        "red.6",
        "cyan.6",
        "violet.6",
        "lime.6",
        "pink.6",
        "indigo.6",
    ];

    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reports/monthly-yoy", Handle)
            .WithTags("Reports")
            .WithSummary("Get monthly year-over-year report")
            .WithDescription("Returns Jan-Dec monthly totals with grouped series for each selected year.")
            .Produces<MonthlyYoyReportResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<MonthlyYoyReportResponse>, ValidationProblem>> Handle(
        [AsParameters] GetMonthlyYoyReportQuery query,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var currentYear = DateTime.UtcNow.Year;
        var endYear = query.EndYear ?? currentYear;
        var startYear = query.StartYear ?? Math.Max(2000, endYear - 2);

        if (startYear > endYear)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(query.StartYear)] = ["StartYear cannot be greater than EndYear."],
            });
        }

        var yearCount = endYear - startYear + 1;
        if (yearCount > 10)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(query.EndYear)] = ["Year range cannot be greater than 10 years."],
            });
        }

        var userId = currentUserContext.GetScopedUserId();
        var rangeStart = new DateTime(startYear, 1, 1);
        var rangeEnd = new DateTime(endYear, 12, 31, 23, 59, 59, 999);

        var transactionsQuery = dbContext.Transactions
            .AsNoTracking()
            .ForUser(userId)
            .Where(transaction => transaction.Date >= rangeStart && transaction.Date <= rangeEnd)
            .Select(transaction => new
            {
                transaction.Date,
                transaction.Type,
                transaction.Amount,
                transaction.IsRefund,
                transaction.TripId,
            });

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

        var transactions = await transactionsQuery
            .OrderBy(transaction => transaction.Date)
            .ToListAsync(cancellationToken);

        var totalsByYearMonth = new Dictionary<int, decimal[]>();
        for (var year = startYear; year <= endYear; year++)
        {
            totalsByYearMonth[year] = new decimal[12];
        }

        foreach (var transaction in transactions)
        {
            var amount = GetSignedAmount(query.Type, transaction.Type, transaction.Amount, transaction.IsRefund);
            if (amount == 0)
            {
                continue;
            }

            var year = transaction.Date.Year;
            if (year < startYear || year > endYear)
            {
                continue;
            }

            var monthIndex = transaction.Date.Month - 1;
            totalsByYearMonth[year][monthIndex] += amount;
        }

        var orderedYears = Enumerable.Range(startYear, yearCount).ToList();

        var series = orderedYears
            .Select((year, index) =>
            {
                var key = year.ToString();
                var total = Math.Round(totalsByYearMonth[year].Sum(), 2);
                return new MonthlyYoySeriesResponse(
                    key,
                    key,
                    year,
                    YearColors[index % YearColors.Length],
                    total);
            })
            .ToList();

        var data = Enumerable.Range(1, 12)
            .Select(month =>
            {
                var values = new Dictionary<string, decimal>();
                decimal total = 0;

                foreach (var year in orderedYears)
                {
                    var value = Math.Round(totalsByYearMonth[year][month - 1], 2);
                    values[year.ToString()] = value;
                    total += value;
                }

                return new MonthlyYoyPointResponse(
                    month,
                    MonthLabels[month - 1],
                    values,
                    Math.Round(total, 2));
            })
            .ToList();

        var yearTotals = orderedYears
            .Select(year => new MonthlyYoyYearTotalResponse(year, Math.Round(totalsByYearMonth[year].Sum(), 2)))
            .ToList();

        var reportTotal = Math.Round(yearTotals.Sum(item => item.Total), 2);
        var latestYearTotal = yearTotals.LastOrDefault()?.Total ?? 0;
        var previousYearTotal = yearTotals.Count > 1 ? yearTotals[^2].Total : 0;

        var response = new MonthlyYoyReportResponse(
            query.Type,
            startYear,
            endYear,
            MonthLabels.ToList(),
            series,
            data,
            yearTotals,
            new MonthlyYoySummaryResponse(
                reportTotal,
                previousYearTotal,
                Math.Round(latestYearTotal / 12m, 2),
                yearTotals.Count));

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
}