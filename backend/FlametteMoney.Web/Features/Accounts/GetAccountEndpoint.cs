using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record GetAccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string Currency,
    string Color,
    string Icon,
    AccountType Type,
    decimal CurrentBalance);

public sealed class GetAccountEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/accounts/{id:guid}", Handle)
            .WithTags("Accounts")
            .WithSummary("Get account details")
            .WithDescription("Get details for a specific account.")
            .Produces<GetAccountResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Results<Ok<GetAccountResponse>, NotFound>> Handle(
        [FromRoute] Guid id,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var account = await dbContext.Accounts
            .AsNoTracking()
            .ForUser(userId)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (account is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new GetAccountResponse(
            account.Id,
            account.Name,
            account.Description,
            account.Currency,
            account.Color,
            account.Icon,
            account.Type,
            account.CurrentBalance));
    }
}
