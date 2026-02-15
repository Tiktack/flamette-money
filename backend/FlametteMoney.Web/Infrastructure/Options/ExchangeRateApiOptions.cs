namespace FlametteMoney.Web.Infrastructure.Options;

public sealed class ExchangeRateApiOptions
{
    public const string SectionName = "ExchangeRateApi";

    public string ApiKey { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://v6.exchangerate-api.com";

    public int CacheHours { get; set; } = 5;
}
