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

public record CreateCategoryRequest(
    string Name,
    string Color,
    string Icon,
    Guid? ParentId,
    CategoryType Type);

public record CreateCategoryResponse(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    Guid? ParentId);

public sealed class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
{
    public CreateCategoryRequestValidator()
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

        RuleFor(request => request.Type)
            .IsInEnum();
    }
}

public sealed class CreateCategoryEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/categories", Handle)
            .WithTags("Categories")
            .WithSummary("Create category")
            .WithDescription("Create a category or subcategory.")
            .Produces<CreateCategoryResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();
    }

    private static async Task<Results<Created<CreateCategoryResponse>, BadRequest<ValidationProblemDetails>>> Handle(
        [FromBody] CreateCategoryRequest request,
        [FromServices] IValidator<CreateCategoryRequest> validator,
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

        if (request.ParentId is not null)
        {
            var parent = await dbContext.Categories
                .AsNoTracking()
                .ForUser(userId)
                .FirstOrDefaultAsync(category => category.Id == request.ParentId, cancellationToken);

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

            if (parent.Type != request.Type)
            {
                return TypedResults.BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    [nameof(request.Type)] = ["Subcategory type must match parent type."]
                }));
            }
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Color = request.Color.Trim(),
            Icon = request.Icon.Trim(),
            ParentId = request.ParentId,
            Type = request.Type
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/categories/{category.Id}", new CreateCategoryResponse(
            category.Id,
            category.Name,
            category.Color,
            category.Icon,
            category.Type,
            category.ParentId));
    }
}
