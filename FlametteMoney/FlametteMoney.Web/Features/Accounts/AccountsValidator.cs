using FluentValidation;

namespace FlametteMoney.Web.Features.Accounts;

public sealed class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    private static readonly HashSet<string> SupportedCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "USD",
        "PLN",
        "EUR",
        "CAD"
    };

    public CreateAccountRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(request => request.Currency)
            .NotEmpty()
            .Must(currency => SupportedCurrencies.Contains(currency))
            .WithMessage("Currency must be one of: USD, PLN, EUR, CAD.");

        RuleFor(request => request.InitialBalance)
            .GreaterThanOrEqualTo(0);
    }
}

public sealed class UpdateAccountRequestValidator : AbstractValidator<UpdateAccountRequest>
{
    public UpdateAccountRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);
    }
}
