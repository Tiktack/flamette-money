using Carter;
using FlametteMoney.Web.Infrastructure.Currency;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FlametteMoney.Web.Features.AppInfo;

public sealed record AppInfoCurrencyResponse(string Code);

public sealed record AppInfoResponse(List<AppInfoCurrencyResponse> SupportedCurrencies);

public sealed class GetAppInfoEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/app-info", Handle)
            .WithTags("AppInfo")
            .WithSummary("Get app metadata")
            .WithDescription("Returns application metadata such as supported currencies.")
            .Produces<AppInfoResponse>(StatusCodes.Status200OK);
    }

    private static Ok<AppInfoResponse> Handle()
    {
        var response = new AppInfoResponse(
            SupportedCurrencies.All
                .Select(code => new AppInfoCurrencyResponse(code))
                .ToList());

        return TypedResults.Ok(response);
    }
}
