using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using FlametteMoney.Web.Infrastructure.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Categories;

public record UpdateCategoryRequest(
    string Name,
    string Color,
    string Icon,
    Guid? ParentId);

public record UpdateCategoryResponse(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    Guid? ParentId);

public sealed class UpdateCategoryRequestValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(request => request.Color)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(request => request.Icon)
            .NotEmpty()
            .MaximumLength(100);
    }
}

public sealed class UpdateCategoryEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/categories/{id:guid}", Handle)
            .WithTags("Categories")
            .WithSummary("Update category")
            .WithDescription("Update category name, color, icon, and parent.")
            .Produces<UpdateCategoryResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Ok<UpdateCategoryResponse>, NotFound, BadRequest<ValidationProblemDetails>>> Handle(
        [FromRoute] Guid id,
        [FromBody] UpdateCategoryRequest request,
        [FromServices] IValidator<UpdateCategoryRequest> validator,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(validationResult.ToProblemDetails()));
        }

        var category = await dbContext.Categories
            .ForUser(userId)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (category is null)
        {
            return TypedResults.NotFound();
        }

        if (request.ParentId == id)
        {
            return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.ParentId)] = ["Category cannot be its own parent."]
            }));
        }

        if (request.ParentId is not null)
        {
            var parent = await dbContext.Categories
                .AsNoTracking()
                .ForUser(userId)
                .FirstOrDefaultAsync(parentItem => parentItem.Id == request.ParentId, cancellationToken);

            if (parent is null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.ParentId)] = ["Parent category was not found."]
                }));
            }

            if (parent.ParentId is not null)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.ParentId)] = ["Only one nesting level is allowed."]
                }));
            }

            if (parent.Type != category.Type)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.ParentId)] = ["Parent category type must match."]
                }));
            }
        }

        category.Name = request.Name.Trim();
        category.Color = request.Color.Trim();
        category.Icon = request.Icon.Trim();
        category.ParentId = request.ParentId;

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new UpdateCategoryResponse(
            category.Id,
            category.Name,
            category.Color,
            category.Icon,
            category.Type,
            category.ParentId));
    }
}
