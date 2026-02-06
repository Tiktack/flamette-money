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
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    string? Note,
    string? MerchantName,
    string? Location);

public record CreateTransactionResponse(
    Guid Id,
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    bool IsRefund,
    string? Note,
    string? MerchantName,
    string? Location);

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

        RuleFor(request => request.MerchantName)
            .MaximumLength(200);

        RuleFor(request => request.Location)
            .MaximumLength(400);
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

        Account? targetAccount = null;
        Guid? categoryId = request.CategoryId;
        Guid? subCategoryId = request.SubCategoryId;
        Guid? originalTransactionId = null;

        if (request.Type == TransactionType.Transfer)
        {
            if (request.TargetAccountId is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TargetAccountId)] = ["Target account is required for transfers."]
                }));
            }

            if (request.TargetAccountId == request.AccountId)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TargetAccountId)] = ["Target account must be different from source account."]
                }));
            }

            if (request.CategoryId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Category is not applicable for transfers."]
                }));
            }

            if (request.OriginalTransactionId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.OriginalTransactionId)] = ["Original transaction is only valid for refunds."]
                }));
            }

            targetAccount = await dbContext.Accounts
                .FirstOrDefaultAsync(item => item.Id == request.TargetAccountId, cancellationToken);

            if (targetAccount is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TargetAccountId)] = ["Target account was not found."]
                }));
            }

            categoryId = null;
            subCategoryId = null;
        }
        else if (request.Type == TransactionType.Refund)
        {
            if (request.TargetAccountId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TargetAccountId)] = ["Target account is only valid for transfers."]
                }));
            }

            if (request.OriginalTransactionId is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.OriginalTransactionId)] = ["Original transaction is required for refunds."]
                }));
            }

            var originalTransaction = await dbContext.Transactions
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == request.OriginalTransactionId, cancellationToken);

            if (originalTransaction is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.OriginalTransactionId)] = ["Original transaction was not found."]
                }));
            }

            if (originalTransaction.Type != TransactionType.Expense)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.OriginalTransactionId)] = ["Refunds can only reference expense transactions."]
                }));
            }

            if (originalTransaction.AccountId != request.AccountId)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.AccountId)] = ["Refunds must use the same account as the original transaction."]
                }));
            }

            if (request.CategoryId is not null && request.CategoryId != originalTransaction.CategoryId)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Refund category must match the original transaction."]
                }));
            }

            if (request.SubCategoryId is not null && request.SubCategoryId != originalTransaction.SubCategoryId)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.SubCategoryId)] = ["Refund subcategory must match the original transaction."]
                }));
            }

            categoryId = originalTransaction.CategoryId;
            subCategoryId = originalTransaction.SubCategoryId;
            originalTransactionId = originalTransaction.Id;

            if (categoryId is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Refunds require a category."]
                }));
            }

            var refundCategory = await dbContext.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == categoryId, cancellationToken);

            if (refundCategory is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Category was not found."]
                }));
            }

            if (refundCategory.Type != CategoryType.Expense)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Refunds must use an expense category."]
                }));
            }
        }
        else
        {
            if (request.TargetAccountId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TargetAccountId)] = ["Target account is only valid for transfers."]
                }));
            }

            if (request.OriginalTransactionId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.OriginalTransactionId)] = ["Original transaction is only valid for refunds."]
                }));
            }

            if (request.CategoryId is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.CategoryId)] = ["Category is required."]
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
        }

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Date = request.Date,
            Type = request.Type,
            Amount = request.Amount,
            AccountId = request.AccountId,
            CategoryId = categoryId,
            SubCategoryId = subCategoryId,
            TargetAccountId = targetAccount?.Id,
            OriginalTransactionId = originalTransactionId,
            IsRefund = request.Type == TransactionType.Refund,
            Note = request.Note?.Trim(),
            MerchantName = request.MerchantName?.Trim(),
            Location = request.Location?.Trim()
        };

        ApplyBalances(account, targetAccount, transaction.Type, transaction.Amount);
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
            transaction.TargetAccountId,
            transaction.OriginalTransactionId,
            transaction.IsRefund,
            transaction.Note,
            transaction.MerchantName,
            transaction.Location));
    }

    private static bool TypeMatches(CategoryType categoryType, TransactionType transactionType)
    {
        return categoryType switch
        {
            CategoryType.Income => transactionType == TransactionType.Income,
            CategoryType.Expense => transactionType is TransactionType.Expense or TransactionType.Refund,
            _ => false
        };
    }

    private static void ApplyBalances(Account account, Account? targetAccount, TransactionType type, decimal amount)
    {
        var (sourceDelta, targetDelta) = GetBalanceDeltas(type, amount);
        account.CurrentBalance += sourceDelta;

        if (targetDelta is not null && targetAccount is not null)
        {
            targetAccount.CurrentBalance += targetDelta.Value;
        }
    }

    private static (decimal SourceDelta, decimal? TargetDelta) GetBalanceDeltas(TransactionType type, decimal amount)
    {
        return type switch
        {
            TransactionType.Expense => (-amount, null),
            TransactionType.Income => (amount, null),
            TransactionType.Refund => (amount, null),
            TransactionType.Transfer => (-amount, amount),
            _ => (0m, null)
        };
    }
}
