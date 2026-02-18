using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Trips;

public sealed record UpdateTripRequest(
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    string? ImageUrl);

public sealed record UpdateTripResponse(
    Guid Id,
    string Name,
    DateTime? StartDate,
    DateTime? EndDate,
    string? ImageUrl);

public sealed class UpdateTripRequestValidator : AbstractValidator<UpdateTripRequest>
{
    public UpdateTripRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

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

public sealed class UpdateTripEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/trips/{id:guid}", Handle)
            .WithTags("Trips")
            .WithSummary("Update trip")
            .WithDescription("Update trip details.")
            .Produces<UpdateTripResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<UpdateTripResponse>, NotFound, BadRequest<ValidationProblemDetails>>> Handle(
        [FromRoute] Guid id,
        [FromBody] UpdateTripRequest request,
        [FromServices] IValidator<UpdateTripRequest> validator,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var trip = await dbContext.Trips.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (trip is null)
        {
            return TypedResults.NotFound();
        }

        trip.Name = request.Name.Trim();
        trip.StartDate = request.StartDate;
        trip.EndDate = request.EndDate;
        trip.ImageUrl = request.ImageUrl?.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UpdateTripResponse(
            trip.Id,
            trip.Name,
            trip.StartDate,
            trip.EndDate,
            trip.ImageUrl));
    }
}
