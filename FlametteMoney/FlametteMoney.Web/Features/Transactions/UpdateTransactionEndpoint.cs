using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record UpdateTransactionRequest(
    DateTimeOffset Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid CategoryId,
    Guid? SubCategoryId,
    string? Note);

public record UpdateTransactionResponse(
    Guid Id,
    DateTimeOffset Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid CategoryId,
    Guid? SubCategoryId,
    string? Note);

public sealed class UpdateTransactionRequestValidator : AbstractValidator<UpdateTransactionRequest>
{
    public UpdateTransactionRequestValidator()
    {
        RuleFor(request => request.Amount)
            .GreaterThan(0);

        RuleFor(request => request.Date)
            .NotEmpty();

        RuleFor(request => request.Note)
            .MaximumLength(500);
    }
}

public sealed class UpdateTransactionEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/transactions/{id:guid}", Handle)
            .WithTags("Transactions")
            .WithSummary("Update transaction")
            .WithDescription("Update a transaction and adjust account balances.")
            .Produces<UpdateTransactionResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<UpdateTransactionResponse>, NotFound, BadRequest<ValidationProblemDetails>>> Handle(
        [FromRoute] Guid id,
        [FromBody] UpdateTransactionRequest request,
        [FromServices] IValidator<UpdateTransactionRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var transaction = await dbContext.Transactions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (transaction is null)
        {
            return TypedResults.NotFound();
        }

        var oldAccount = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == transaction.AccountId, cancellationToken);
        if (oldAccount is null)
        {
            return TypedResults.NotFound();
        }

        var newAccount = transaction.AccountId == request.AccountId
            ? oldAccount
            : await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == request.AccountId, cancellationToken);

        if (newAccount is null)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.AccountId)] = ["Account was not found."]
            }));
        }

        var category = await dbContext.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.CategoryId, cancellationToken);
        if (category is null)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.CategoryId)] = ["Category was not found."]
            }));
        }

        if (!TypeMatches(category.Type, request.Type))
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.Type)] = ["Transaction type must match category type."]
            }));
        }

        if (request.SubCategoryId is not null)
        {
            var subCategory = await dbContext.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == request.SubCategoryId, cancellationToken);

            if (subCategory is null || subCategory.ParentId != request.CategoryId)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.SubCategoryId)] = ["Subcategory must be a child of the category."]
                }));
            }

            if (subCategory.Type != category.Type)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.SubCategoryId)] = ["Subcategory type must match category type."]
                }));
            }
        }

        RevertBalance(oldAccount, transaction.Type, transaction.Amount);
        ApplyBalance(newAccount, request.Type, request.Amount);

        transaction.Date = request.Date;
        transaction.Type = request.Type;
        transaction.Amount = request.Amount;
        transaction.AccountId = request.AccountId;
        transaction.CategoryId = request.CategoryId;
        transaction.SubCategoryId = request.SubCategoryId;
        transaction.Note = request.Note?.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UpdateTransactionResponse(
            transaction.Id,
            transaction.Date,
            transaction.Type,
            transaction.Amount,
            transaction.AccountId,
            transaction.CategoryId,
            transaction.SubCategoryId,
            transaction.Note));
    }

    private static bool TypeMatches(CategoryType categoryType, TransactionType transactionType)
    {
        return categoryType switch
        {
            CategoryType.Income => transactionType == TransactionType.Income,
            CategoryType.Expense => transactionType == TransactionType.Expense,
            _ => false
        };
    }

    private static void ApplyBalance(Account account, TransactionType type, decimal amount)
    {
        account.CurrentBalance = type == TransactionType.Expense
            ? account.CurrentBalance - amount
            : account.CurrentBalance + amount;
    }

    private static void RevertBalance(Account account, TransactionType type, decimal amount)
    {
        account.CurrentBalance = type == TransactionType.Expense
            ? account.CurrentBalance + amount
            : account.CurrentBalance - amount;
    }
}
