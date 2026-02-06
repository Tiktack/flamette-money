using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record UpdateAccountRequest(string Name, string Color, AccountType Type);

public record UpdateAccountResponse(
    Guid Id,
    string Name,
    string Currency,
    string Color,
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

        RuleFor(request => request.Color)
            .NotEmpty()
            .Matches("^#?[0-9a-fA-F]{6}$")
            .WithMessage("Color must be a 6-digit hex value.");
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
        account.Color = NormalizeColor(request.Color);
        account.Type = request.Type;

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UpdateAccountResponse(
            account.Id,
            account.Name,
            account.Currency,
            account.Color,
            account.Type,
            account.InitialBalance,
            account.CurrentBalance));
    }

    private static string NormalizeColor(string color)
    {
        var trimmed = color.Trim();
        return trimmed.StartsWith('#')
            ? trimmed.ToUpperInvariant()
            : $"#{trimmed.ToUpperInvariant()}";
    }
}
