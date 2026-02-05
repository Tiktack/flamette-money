using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public sealed class AccountsEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/accounts", HandleCreate)
            .WithTags("Accounts")
            .WithSummary("Create account")
            .WithDescription("Create a new account with an initial balance.")
            .Produces<AccountDetailResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        app.MapGet("/api/accounts", HandleList)
            .WithTags("Accounts")
            .WithSummary("List accounts")
            .WithDescription("List all accounts with current balances.")
            .Produces<IEnumerable<AccountSummaryResponse>>(StatusCodes.Status200OK);

        app.MapGet("/api/accounts/{id:guid}", HandleGet)
            .WithTags("Accounts")
            .WithSummary("Get account details")
            .WithDescription("Get details for a specific account.")
            .Produces<AccountDetailResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        app.MapPut("/api/accounts/{id:guid}", HandleUpdate)
            .WithTags("Accounts")
            .WithSummary("Update account")
            .WithDescription("Update account name and type.")
            .Produces<AccountDetailResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();

        app.MapDelete("/api/accounts/{id:guid}", HandleDelete)
            .WithTags("Accounts")
            .WithSummary("Delete account")
            .WithDescription("Delete account if no transactions exist.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);
    }

    private static async Task<Results<Created<AccountDetailResponse>, BadRequest<ValidationProblemDetails>>> HandleCreate(
        [FromBody] CreateAccountRequest request,
        [FromServices] IValidator<CreateAccountRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Currency = request.Currency.ToUpperInvariant(),
            Type = request.Type,
            InitialBalance = request.InitialBalance,
            CurrentBalance = request.InitialBalance
        };

        dbContext.Accounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/accounts/{account.Id}", new AccountDetailResponse(
            account.Id,
            account.Name,
            account.Currency,
            account.Type,
            account.InitialBalance,
            account.CurrentBalance));
    }

    private static async Task<Ok<List<AccountSummaryResponse>>> HandleList(
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var accounts = await dbContext.Accounts
            .AsNoTracking()
            .OrderBy(account => account.Name)
            .Select(account => new AccountSummaryResponse(
                account.Id,
                account.Name,
                account.Currency,
                account.Type,
                account.InitialBalance,
                account.CurrentBalance))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(accounts);
    }

    private static async Task<Results<Ok<AccountDetailResponse>, NotFound>> HandleGet(
        [FromRoute] Guid id,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (account is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new AccountDetailResponse(
            account.Id,
            account.Name,
            account.Currency,
            account.Type,
            account.InitialBalance,
            account.CurrentBalance));
    }

    private static async Task<Results<Ok<AccountDetailResponse>, NotFound, BadRequest<ValidationProblemDetails>>> HandleUpdate(
        [FromRoute] Guid id,
        [FromBody] UpdateAccountRequest request,
        [FromServices] IValidator<UpdateAccountRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var account = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (account is null)
        {
            return TypedResults.NotFound();
        }

        account.Name = request.Name.Trim();
        account.Type = request.Type;

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new AccountDetailResponse(
            account.Id,
            account.Name,
            account.Currency,
            account.Type,
            account.InitialBalance,
            account.CurrentBalance));
    }

    private static async Task<Results<NoContent, NotFound, Conflict>> HandleDelete(
        [FromRoute] Guid id,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (account is null)
        {
            return TypedResults.NotFound();
        }

        var hasTransactions = await dbContext.Transactions.AnyAsync(item => item.AccountId == id, cancellationToken);
        if (hasTransactions)
        {
            return TypedResults.Conflict();
        }

        dbContext.Accounts.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }
}
