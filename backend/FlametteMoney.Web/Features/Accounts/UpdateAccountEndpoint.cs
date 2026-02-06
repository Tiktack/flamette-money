using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record UpdateAccountRequest(string Name, AccountType Type);

public record UpdateAccountResponse(
    Guid Id,
    string Name,
    string Currency,
    AccountType Type,
    decimal InitialBalance,
    decimal CurrentBalance);

public sealed class UpdateAccountRequestValidator : AbstractValidator<UpdateAccountRequest>
{
    public UpdateAccountRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);
    }
}

public sealed class UpdateAccountEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/accounts/{id:guid}", Handle)
            .WithTags("Accounts")
            .WithSummary("Update account")
            .WithDescription("Update account name and type.")
            .Produces<UpdateAccountResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<UpdateAccountResponse>, NotFound, BadRequest<ValidationProblemDetails>>> Handle(
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

        return TypedResults.Ok(new UpdateAccountResponse(
            account.Id,
            account.Name,
            account.Currency,
            account.Type,
            account.InitialBalance,
            account.CurrentBalance));
    }
}
