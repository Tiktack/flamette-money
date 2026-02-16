using Carter;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FlametteMoney.Web.Features.Accounts;

public record CreateAccountRequest(string Name, string Currency, string Color, string Icon, AccountType Type, decimal CurrentBalance);

public record CreateAccountResponse(
    Guid Id,
    string Name,
    string Currency,
    string Color,
    string Icon,
    AccountType Type,
    decimal CurrentBalance);

public sealed class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    public CreateAccountRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(request => request.Currency)
            .NotEmpty()
            .Must(SupportedCurrencies.IsSupported)
            .WithMessage($"Currency must be one of: {string.Join(", ", SupportedCurrencies.All)}.");

        RuleFor(request => request.Color)
            .NotEmpty()
            .Matches("^#?[0-9a-fA-F]{6}$")
            .WithMessage("Color must be a 6-digit hex value.");

        RuleFor(request => request.Icon)
            .NotEmpty()
            .MaximumLength(100);
    }
}

public sealed class CreateAccountEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/accounts", Handle)
            .WithTags("Accounts")
            .WithSummary("Create account")
            .WithDescription("Create a new account with the latest balance.")
            .Produces<CreateAccountResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Created<CreateAccountResponse>, BadRequest<ValidationProblemDetails>>> Handle(
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
            Color = NormalizeColor(request.Color),
            Icon = NormalizeIcon(request.Icon),
            Type = request.Type,
            CurrentBalance = request.CurrentBalance
        };

        dbContext.Accounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/accounts/{account.Id}", new CreateAccountResponse(
            account.Id,
            account.Name,
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
}
