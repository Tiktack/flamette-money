using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Accounts;

public record UpdateAccountRequest(string Name, string? Description, string Color, string Icon, AccountType Type, decimal CurrentBalance);

public record UpdateAccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string Currency,
    string Color,
    string Icon,
    AccountType Type,
    decimal CurrentBalance);

public sealed class UpdateAccountRequestValidator : AbstractValidator<UpdateAccountRequest>
{
    public UpdateAccountRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(request => request.Description)
            .MaximumLength(500);

        RuleFor(request => request.Color)
            .NotEmpty()
            .Matches("^#?[0-9a-fA-F]{6}$")
            .WithMessage("Color must be a 6-digit hex value.");

        RuleFor(request => request.Icon)
            .NotEmpty()
            .MaximumLength(100);
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
        account.Description = NormalizeDescription(request.Description);
        account.Color = NormalizeColor(request.Color);
        account.Icon = NormalizeIcon(request.Icon);
        account.Type = request.Type;
        account.CurrentBalance = request.CurrentBalance;

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UpdateAccountResponse(
            account.Id,
            account.Name,
            account.Description,
            account.Currency,
            account.Color,
            account.Icon,
            account.Type,
            account.CurrentBalance));
    }

    private static string NormalizeColor(string color)
    {
        var trimmed = color.Trim();
        return trimmed.StartsWith('#')
            ? trimmed.ToUpperInvariant()
            : $"#{trimmed.ToUpperInvariant()}";
    }

    private static string NormalizeIcon(string icon)
    {
        return icon.Trim();
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        return description.Trim();
    }
}
