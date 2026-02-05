using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record CreateTransactionRequest(
    DateTimeOffset Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid CategoryId,
    Guid? SubCategoryId,
    string? Note);

public record CreateTransactionResponse(
    Guid Id,
    DateTimeOffset Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid CategoryId,
    Guid? SubCategoryId,
    string? Note);

public sealed class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
    public CreateTransactionRequestValidator()
    {
        RuleFor(request => request.Amount)
            .GreaterThan(0);

        RuleFor(request => request.Date)
            .NotEmpty();

        RuleFor(request => request.Note)
            .MaximumLength(500);
    }
}

public sealed class CreateTransactionEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/transactions", Handle)
            .WithTags("Transactions")
            .WithSummary("Create transaction")
            .WithDescription("Create a basic income or expense transaction.")
            .Produces<CreateTransactionResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Created<CreateTransactionResponse>, BadRequest<ValidationProblemDetails>>> Handle(
        [FromBody] CreateTransactionRequest request,
        [FromServices] IValidator<CreateTransactionRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var account = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == request.AccountId, cancellationToken);
        if (account is null)
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

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Date = request.Date,
            Type = request.Type,
            Amount = request.Amount,
            AccountId = request.AccountId,
            CategoryId = request.CategoryId,
            SubCategoryId = request.SubCategoryId,
            Note = request.Note?.Trim()
        };

        ApplyBalance(account, transaction.Type, transaction.Amount);
        dbContext.Transactions.Add(transaction);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/transactions/{transaction.Id}", new CreateTransactionResponse(
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
}
