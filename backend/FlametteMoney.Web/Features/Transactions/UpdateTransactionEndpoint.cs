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
    List<CreateTransactionItemRequest>? Items);

public record UpdateTransactionResponse(
    Guid Id,
    DateTime Date,
    TransactionType Type,
    decimal Amount,
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

        RuleFor(request => request.MerchantName)
            .MaximumLength(200);

        RuleFor(request => request.Location)
            .MaximumLength(400);
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

        var transaction = await dbContext.Transactions
            .Include(t => t.Items)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (transaction is null)
        {
            return TypedResults.NotFound();
        }

        var oldAccount = await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == transaction.AccountId, cancellationToken);
        if (oldAccount is null)
        {
            return TypedResults.NotFound();
        }

        var oldTargetAccount = transaction.TargetAccountId is null
            ? null
            : await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == transaction.TargetAccountId, cancellationToken);

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

        Account? newTargetAccount = null;
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

            newTargetAccount = transaction.TargetAccountId == request.TargetAccountId
                ? oldTargetAccount
                : await dbContext.Accounts.FirstOrDefaultAsync(item => item.Id == request.TargetAccountId, cancellationToken);

            if (newTargetAccount is null)
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

        RevertBalances(oldAccount, oldTargetAccount, transaction.Type, transaction.Amount);
        ApplyBalances(newAccount, newTargetAccount, request.Type, request.Amount);

        transaction.Date = request.Date;
        transaction.Type = request.Type;
        transaction.Amount = request.Amount;
        transaction.AccountId = request.AccountId;
        transaction.TripId = tripId;
        transaction.CategoryId = categoryId;
        transaction.SubCategoryId = subCategoryId;
        transaction.TargetAccountId = newTargetAccount?.Id;
        transaction.OriginalTransactionId = originalTransactionId;
        transaction.IsRefund = request.Type == TransactionType.Refund;
        transaction.Note = request.Note?.Trim();
        transaction.MerchantName = request.MerchantName?.Trim();
        transaction.Location = request.Location?.Trim();

        // Replace items
        dbContext.TransactionItems.RemoveRange(transaction.Items);
        transaction.Items.Clear();

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

        await dbContext.SaveChangesAsync(cancellationToken);

        var responseItems = transaction.Items.Select(i => new TransactionItemResponse(
            i.Id, i.Name, i.Quantity, i.Unit, i.UnitPrice,
            i.PromotionAmount, i.FinalAmount, i.CategoryId, i.SubCategoryId)).ToList();

        return TypedResults.Ok(new UpdateTransactionResponse(
            transaction.Id,
            transaction.Date,
            transaction.Type,
            transaction.Amount,
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

    private static void ApplyBalances(Account account, Account? targetAccount, TransactionType type, decimal amount)
    {
        var (sourceDelta, targetDelta) = GetBalanceDeltas(type, amount);
        account.CurrentBalance += sourceDelta;

        if (targetDelta is not null && targetAccount is not null)
        {
            targetAccount.CurrentBalance += targetDelta.Value;
        }
    }

    private static void RevertBalances(Account account, Account? targetAccount, TransactionType type, decimal amount)
    {
        var (sourceDelta, targetDelta) = GetBalanceDeltas(type, amount);
        account.CurrentBalance -= sourceDelta;

        if (targetDelta is not null && targetAccount is not null)
        {
            targetAccount.CurrentBalance -= targetDelta.Value;
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
