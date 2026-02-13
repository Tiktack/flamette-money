using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Features.Categories;

public sealed class DeleteCategoryEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/categories/{id:guid}", Handle)
            .WithTags("Categories")
            .WithSummary("Delete category")
            .WithDescription("Delete category if it is not used by transactions.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);
    }

    private static async Task<Results<NoContent, NotFound, Conflict>> Handle(
        [FromRoute] Guid id,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userId = currentUserContext.GetScopedUserId();

        var category = await dbContext.Categories
            .ForUser(userId)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (category is null)
        {
            return TypedResults.NotFound();
        }

        var hasTransactions = await dbContext.Transactions
            .AnyAsync(item => item.CategoryId == id || item.SubCategoryId == id, cancellationToken);
        if (hasTransactions)
        {
            return TypedResults.Conflict();
        }

        dbContext.Categories.Remove(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }
}
