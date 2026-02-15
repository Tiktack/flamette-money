using FlametteMoney.Web.Infrastructure.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlametteMoney.Web.Infrastructure.Currency;

public sealed record ExchangeRateSnapshot(
    string BaseCurrency,
    Dictionary<string, decimal> RatesToBase,
    bool UsedFallback);

public interface IExchangeRateService
{
    Task<ExchangeRateSnapshot> GetRatesToBaseAsync(string baseCurrency, CancellationToken cancellationToken);
}

internal sealed class ExchangeRateService : IExchangeRateService
{
    private static readonly AsyncRetryPolicy<HttpResponseMessage> RetryPolicy = Policy<HttpResponseMessage>
        .Handle<HttpRequestException>()
        .Or<TaskCanceledException>()
        .OrResult(response => !response.IsSuccessStatusCode)
        .WaitAndRetryAsync(
            [TimeSpan.FromMilliseconds(250), TimeSpan.FromMilliseconds(500)]);

    private static readonly Dictionary<string, decimal> SeedUsdRates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["USD"] = 1m,
        ["EUR"] = 1.08m,
        ["GBP"] = 1.27m,
        ["CAD"] = 0.74m,
        ["PLN"] = 0.26m,
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _memoryCache;
    private readonly ExchangeRateApiOptions _options;

    public ExchangeRateService(
        IHttpClientFactory httpClientFactory,
        IMemoryCache memoryCache,
        IOptions<ExchangeRateApiOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _memoryCache = memoryCache;
        _options = options.Value;
    }

    public async Task<ExchangeRateSnapshot> GetRatesToBaseAsync(string baseCurrency, CancellationToken cancellationToken)
    {
        var normalizedBase = baseCurrency.Trim().ToUpperInvariant();
        var cacheKey = $"fx:rates-to-base:{normalizedBase}";

        if (_memoryCache.TryGetValue<ExchangeRateSnapshot>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        var snapshot = await BuildSnapshotAsync(normalizedBase, cancellationToken);
        var cacheDuration = TimeSpan.FromHours(Math.Max(1, _options.CacheHours));
        _memoryCache.Set(cacheKey, snapshot, cacheDuration);
        return snapshot;
    }

    private async Task<ExchangeRateSnapshot> BuildSnapshotAsync(string baseCurrency, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return BuildFallbackSnapshot(baseCurrency);
        }

        var endpoint = $"{_options.BaseUrl.TrimEnd('/')}/v6/{_options.ApiKey}/latest/{baseCurrency}";
        var client = _httpClientFactory.CreateClient("ExchangeRateApi");

        try
        {
            using var response = await RetryPolicy.ExecuteAsync(
                async token => await client.GetAsync(endpoint, token),
                cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<ExchangeRateApiResponse>(content, cancellationToken: cancellationToken);

            if (payload?.Result != "success" || payload.ConversionRates is null)
            {
                throw new InvalidOperationException("ExchangeRateApi returned non-success payload.");
            }

            var rates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
            {
                [baseCurrency] = 1m,
            };

            foreach (var (currency, conversionRate) in payload.ConversionRates)
            {
                if (conversionRate <= 0)
                {
                    continue;
                }

                var normalizedCurrency = currency.Trim().ToUpperInvariant();
                rates[normalizedCurrency] = normalizedCurrency.Equals(baseCurrency, StringComparison.OrdinalIgnoreCase)
                    ? 1m
                    : 1m / conversionRate;
            }

            foreach (var currency in SupportedCurrencies.All)
            {
                if (rates.ContainsKey(currency))
                {
                    continue;
                }

                var fallbackRate = TryResolveFallbackRate(currency, baseCurrency);
                if (fallbackRate is not null)
                {
                    rates[currency] = fallbackRate.Value;
                }
            }

            return new ExchangeRateSnapshot(baseCurrency, rates, false);
        }
        catch
        {
            return BuildFallbackSnapshot(baseCurrency);
        }
    }

    private static ExchangeRateSnapshot BuildFallbackSnapshot(string baseCurrency)
    {
        var rates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
        {
            [baseCurrency] = 1m,
        };

        foreach (var currency in SupportedCurrencies.All)
        {
            var rate = currency.Equals(baseCurrency, StringComparison.OrdinalIgnoreCase)
                ? 1m
                : TryResolveFallbackRate(currency, baseCurrency);

            if (rate is not null)
            {
                rates[currency] = rate.Value;
            }
        }

        return new ExchangeRateSnapshot(baseCurrency, rates, true);
    }

    private static decimal? TryResolveFallbackRate(string currency, string baseCurrency)
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

    private sealed class ExchangeRateApiResponse
    {
        public string? Result { get; init; }

        [JsonPropertyName("documentation")]
        public string? Documentation { get; init; }

        [JsonPropertyName("terms_of_use")]
        public string? TermsOfUse { get; init; }

        [JsonPropertyName("time_last_update_unix")]
        public long TimeLastUpdateUnix { get; init; }

        [JsonPropertyName("time_last_update_utc")]
        public string? TimeLastUpdateUtc { get; init; }

        [JsonPropertyName("time_next_update_unix")]
        public long TimeNextUpdateUnix { get; init; }

        [JsonPropertyName("time_next_update_utc")]
        public string? TimeNextUpdateUtc { get; init; }

        [JsonPropertyName("base_code")]
        public string? BaseCode { get; init; }

        [JsonPropertyName("conversion_rates")]
        public Dictionary<string, decimal>? ConversionRates { get; init; }
    }
}
