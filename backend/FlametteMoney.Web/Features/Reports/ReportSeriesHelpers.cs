namespace FlametteMoney.Web.Features.Reports;

internal static class ReportSeriesHelpers
{
    public static decimal TryConvertAmount(
        decimal amount,
        string sourceCurrency,
        string baseCurrency,
        Dictionary<string, decimal> ratesToBase)
    {
        if (amount == 0)
        {
            return 0m;
        }

        var normalizedSource = sourceCurrency.Trim().ToUpperInvariant();
        var rate = ratesToBase[normalizedSource];

        return amount * rate;
    }

    public static ReportInterval ResolveInterval(DateTime startDate, DateTime endDate, ReportInterval requested)
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
        if (monthSpan > 3)
        {
            return ReportInterval.Month;
        }

        var daySpan = (endDate.Date - startDate.Date).Days + 1;
        if (daySpan > 31)
        {
            return ReportInterval.Week;
        }

        return ReportInterval.Day;
    }

    public static List<ReportBucketResponse> BuildBuckets(DateTime startDate, DateTime endDate, ReportInterval interval)
    {
        var buckets = new List<ReportBucketResponse>();

        if (interval == ReportInterval.None)
        {
            buckets.Add(new ReportBucketResponse("all", "All"));
            return buckets;
        }

        if (interval == ReportInterval.Day)
        {
            var singleMonth = startDate.Year == endDate.Year && startDate.Month == endDate.Month;
            for (var cursor = startDate.Date; cursor <= endDate.Date; cursor = cursor.AddDays(1))
            {
                var key = cursor.ToString("yyyy-MM-dd");
                var label = singleMonth ? cursor.Day.ToString() : cursor.ToString("MMM d");
                buckets.Add(new ReportBucketResponse(key, label));
            }

            return buckets;
        }

        if (interval == ReportInterval.Week)
        {
            for (var cursor = startDate.Date; cursor <= endDate.Date; cursor = cursor.AddDays(7))
            {
                var key = cursor.ToString("yyyy-MM-dd");
                var label = cursor.ToString("MMM d");
                buckets.Add(new ReportBucketResponse(key, label));
            }

            return buckets;
        }

        var monthCursor = new DateTime(startDate.Year, startDate.Month, 1);
        var lastMonth = new DateTime(endDate.Year, endDate.Month, 1);
        var showYear = monthCursor.Year != lastMonth.Year;

        while (monthCursor <= lastMonth)
        {
            var key = monthCursor.ToString("yyyy-MM");
            var label = showYear ? monthCursor.ToString("MMM yy") : monthCursor.ToString("MMM");
            buckets.Add(new ReportBucketResponse(key, label));
            monthCursor = monthCursor.AddMonths(1);
        }

        return buckets;
    }

    public static string ResolveBucketKey(DateTime startDate, DateTime transactionDate, ReportInterval interval)
    {
        if (interval == ReportInterval.None)
        {
            return "all";
        }

        if (interval == ReportInterval.Day)
        {
            return transactionDate.ToString("yyyy-MM-dd");
        }

        if (interval == ReportInterval.Week)
        {
            var dayOffset = (transactionDate.Date - startDate.Date).Days;
            var weekOffset = (dayOffset / 7) * 7;
            return startDate.AddDays(weekOffset).ToString("yyyy-MM-dd");
        }

        return transactionDate.ToString("yyyy-MM");
    }
}