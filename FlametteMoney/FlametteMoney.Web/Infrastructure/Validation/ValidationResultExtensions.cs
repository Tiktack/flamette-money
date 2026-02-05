using FluentValidation.Results;

namespace FlametteMoney.Web.Infrastructure.Validation;

public static class ValidationResultExtensions
{
    public static IDictionary<string, string[]> ToProblemDetails(this ValidationResult result)
    {
        return result.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).ToArray());
    }
}
