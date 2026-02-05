using Carter;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Categories;

public record CategoryHierarchyResponse(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    Guid? ParentId,
    IReadOnlyList<CategoryHierarchyResponse> Subcategories);

public sealed class ListCategoriesEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/categories", Handle)
            .WithTags("Categories")
            .WithSummary("List categories")
            .WithDescription("Return category hierarchy with subcategories.")
            .Produces<IEnumerable<CategoryHierarchyResponse>>(StatusCodes.Status200OK);
    }

    private static async Task<Ok<List<CategoryHierarchyResponse>>> Handle(
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);

        var lookup = categories.ToLookup(category => category.ParentId);

        List<CategoryHierarchyResponse> MapChildren(Guid? parentId)
        {
            return lookup[parentId]
                .OrderBy(category => category.Name)
                .Select(category => new CategoryHierarchyResponse(
                    category.Id,
                    category.Name,
                    category.Color,
                    category.Icon,
                    category.Type,
                    category.ParentId,
                    MapChildren(category.Id)))
                .ToList();
        }

        return TypedResults.Ok(MapChildren(null));
    }
}
