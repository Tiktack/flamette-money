using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Transactions;

public record CreateTransactionItemRequest(
    string Name,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal PromotionAmount,
    Guid? CategoryId,
    Guid? SubCategoryId);

public record CreateTransactionRequest(
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    Guid AccountId,
    Guid? TripId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    string? Note,
    string? MerchantName,
    string? Location,
    decimal? Amount2 = null,
    string? Currency = null,
    string? Currency2 = null,
    List<CreateTransactionItemRequest>? Items = null);

public record CreateTransactionResponse(
    Guid Id,
    DateTime Date,
    TransactionType Type,
    decimal Amount,
    decimal? Amount2,
    string? Currency,
    string? Currency2,
    Guid AccountId,
    Guid? TripId,
    Guid? CategoryId,
    Guid? SubCategoryId,
    Guid? TargetAccountId,
    Guid? OriginalTransactionId,
    bool IsRefund,
    string? Note,
    string? MerchantName,
    string? Location,
    List<TransactionItemResponse> Items);

public sealed class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
    public CreateTransactionRequestValidator()
    {
        RuleFor(request => request.Amount)
            .GreaterThan(0);

        RuleFor(request => request.Amount2)
            .GreaterThan(0)
            .When(request => request.Amount2.HasValue);

        RuleFor(request => request.Date)
            .NotEmpty();

        RuleFor(request => request.Note)
            .MaximumLength(500);

        RuleFor(request => request.MerchantName)
            .MaximumLength(200);

        RuleFor(request => request.Location)
            .MaximumLength(400);

        RuleFor(request => request.Currency)
            .Must(IsValidCurrencyCode)
            .When(request => !string.IsNullOrWhiteSpace(request.Currency))
            .WithMessage("Currency must be a 3-letter code.");

        RuleFor(request => request.Currency2)
            .Must(IsValidCurrencyCode)
            .When(request => !string.IsNullOrWhiteSpace(request.Currency2))
            .WithMessage("Currency 2 must be a 3-letter code.");
    }

    private static bool IsValidCurrencyCode(string? currency)
    {
        return currency is not null && currency.Trim().Length == 3;
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
        Guid? tripId = request.TripId;
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

            if (request.TripId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TripId)] = ["Trip is only applicable for expense transactions."]
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
            tripId = null;
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

            if (request.TripId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TripId)] = ["Trip is inherited from the original expense for refunds."]
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
            tripId = originalTransaction.TripId;
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

            if (request.Type != TransactionType.Expense && request.TripId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.TripId)] = ["Trip is only applicable for expense transactions."]
                }));
            }

            if (request.Type == TransactionType.Expense && request.TripId is not null)
            {
                var tripExists = await dbContext.Trips
                    .AsNoTracking()
                    .AnyAsync(item => item.Id == request.TripId.Value, cancellationToken);

                if (!tripExists)
                {
                    return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                    {
                        [nameof(request.TripId)] = ["Trip was not found."]
                    }));
                }
            }

            if (request.Type != TransactionType.Expense)
            {
                tripId = null;
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
            Amount2 = NormalizeAmount2(request.Type, request.Amount, request.Amount2),
            Currency = NormalizeCurrency(request.Currency) ?? account.Currency,
            Currency2 = request.Type == TransactionType.Transfer
                ? NormalizeCurrency(request.Currency2) ?? targetAccount?.Currency ?? NormalizeCurrency(request.Currency) ?? account.Currency
                : NormalizeCurrency(request.Currency2),
            AccountId = request.AccountId,
            TripId = tripId,
            CategoryId = categoryId,
            SubCategoryId = subCategoryId,
            TargetAccountId = targetAccount?.Id,
            OriginalTransactionId = originalTransactionId,
            IsRefund = request.Type == TransactionType.Refund,
            Note = request.Note?.Trim(),
            MerchantName = request.MerchantName?.Trim(),
            Location = request.Location?.Trim()
        };

        if (request.Items is { Count: > 0 })
        {
            foreach (var itemReq in request.Items)
            {
                var quantity = itemReq.Quantity > 0 ? itemReq.Quantity : 1;
                var finalAmount = (itemReq.UnitPrice * quantity) - itemReq.PromotionAmount;

                transaction.Items.Add(new TransactionItem
                {
                    Id = Guid.NewGuid(),
                    Name = itemReq.Name,
                    Quantity = quantity,
                    Unit = itemReq.Unit,
                    UnitPrice = itemReq.UnitPrice,
                    PromotionAmount = itemReq.PromotionAmount,
                    FinalAmount = finalAmount,
                    CategoryId = itemReq.CategoryId,
                    SubCategoryId = itemReq.SubCategoryId,
                });
            }
        }

        ApplyBalances(account, targetAccount, transaction.Type, transaction.Amount, transaction.Amount2);
        dbContext.Transactions.Add(transaction);
        await dbContext.SaveChangesAsync(cancellationToken);

        var responseItems = transaction.Items.Select(i => new TransactionItemResponse(
            i.Id, i.Name, i.Quantity, i.Unit, i.UnitPrice,
            i.PromotionAmount, i.FinalAmount, i.CategoryId, i.SubCategoryId)).ToList();

        return TypedResults.Created($"/api/transactions/{transaction.Id}", new CreateTransactionResponse(
            transaction.Id,
            transaction.Date,
            transaction.Type,
            transaction.Amount,
            transaction.Amount2,
            transaction.Currency,
            transaction.Currency2,
            transaction.AccountId,
            transaction.TripId,
            transaction.CategoryId,
            transaction.SubCategoryId,
            transaction.TargetAccountId,
            transaction.OriginalTransactionId,
            transaction.IsRefund,
            transaction.Note,
            transaction.MerchantName,
            transaction.Location,
            responseItems));
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

    private static void ApplyBalances(Account account, Account? targetAccount, TransactionType type, decimal amount, decimal? amount2)
    {
        var (sourceDelta, targetDelta) = GetBalanceDeltas(type, amount, amount2);
        account.CurrentBalance += sourceDelta;

        if (targetDelta is not null && targetAccount is not null)
        {
            targetAccount.CurrentBalance += targetDelta.Value;
        }
    }

    private static (decimal SourceDelta, decimal? TargetDelta) GetBalanceDeltas(TransactionType type, decimal amount, decimal? amount2)
    {
        return type switch
        {
            TransactionType.Expense => (-amount, null),
            TransactionType.Income => (amount, null),
            TransactionType.Refund => (amount, null),
            TransactionType.Transfer => (-amount, amount2 ?? amount),
            _ => (0m, null)
        };
    }

    private static decimal? NormalizeAmount2(TransactionType type, decimal amount, decimal? amount2)
    {
        if (type == TransactionType.Transfer)
        {
            return amount2 is > 0 ? amount2 : amount;
        }

        return amount2;
    }

    private static string? NormalizeCurrency(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return null;
        }

        return currency.Trim().ToUpperInvariant();
    }
}
