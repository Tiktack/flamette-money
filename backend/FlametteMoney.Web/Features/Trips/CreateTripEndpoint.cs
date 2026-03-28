using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FlametteMoney.Web.Features.Trips;

public sealed record CreateTripRequest(
    string Name,
    string? Country,
    DateTime StartDate,
    DateTime EndDate,
    string? ImageUrl);

public sealed record CreateTripResponse(
    Guid Id,
    string Name,
    string? Country,
    DateTime? StartDate,
    DateTime? EndDate,
    string? ImageUrl);

public sealed class CreateTripRequestValidator : AbstractValidator<CreateTripRequest>
{
    public CreateTripRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(request => request.Country)
            .Length(2)
            .When(request => !string.IsNullOrWhiteSpace(request.Country))
            .WithMessage("Country must be a 2-letter ISO code.");

        RuleFor(request => request.ImageUrl)
            .MaximumLength(1000)
            .Must(BeValidUrl)
            .When(request => !string.IsNullOrWhiteSpace(request.ImageUrl))
            .WithMessage("ImageUrl must be a valid absolute URL.");

        RuleFor(request => request)
            .Must(request => request.StartDate <= request.EndDate)
            .WithMessage("StartDate cannot be after EndDate.");
    }

    private static bool BeValidUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out _);
    }
}

public sealed class CreateTripEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/trips", Handle)
            .WithTags("Trips")
            .WithSummary("Create trip")
            .WithDescription("Create a trip with optional dates and image.")
            .Produces<CreateTripResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Created<CreateTripResponse>, BadRequest<ValidationProblemDetails>>> Handle(
        [FromBody] CreateTripRequest request,
        [FromServices] IValidator<CreateTripRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var trip = new Trip
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Country = request.Country?.Trim().ToUpperInvariant(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            ImageUrl = request.ImageUrl?.Trim(),
        };

        dbContext.Trips.Add(trip);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/trips/{trip.Id}", new CreateTripResponse(
            trip.Id,
            trip.Name,
            trip.Country,
            trip.StartDate,
            trip.EndDate,
            trip.ImageUrl));
    }
}
