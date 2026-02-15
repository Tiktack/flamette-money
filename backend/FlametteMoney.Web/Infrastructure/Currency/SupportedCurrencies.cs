namespace FlametteMoney.Web.Infrastructure.Currency;

public static class SupportedCurrencies
{
    public static readonly string[] All =
    [
        "PLN",
        "USD",
        "EUR",
        "GBP",
        "CAD"
    ];

    private static readonly HashSet<string> AllSet = new(All, StringComparer.OrdinalIgnoreCase);

    public static bool IsSupported(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return false;
        }

        return AllSet.Contains(currency.Trim());
    }

    public static string NormalizeOrDefault(string? currency, string @default)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return @default;
        }

        var normalized = currency.Trim().ToUpperInvariant();
        return IsSupported(normalized) ? normalized : @default;
    }

    public static string? NormalizeOrNull(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return null;
        }

        var normalized = currency.Trim().ToUpperInvariant();
        return IsSupported(normalized) ? normalized : null;
    }
}
