using FlametteMoney.Web.Features.Categories;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Infrastructure.Database.Seeding;

public static class UserCategoryBootstrapper
{
    public static async Task EnsureForUserAsync(AppDbContext dbContext, Guid userId, CancellationToken cancellationToken)
    {
        var hasAny = await dbContext.Categories
            .IgnoreQueryFilters()
            .AnyAsync(category => category.UserId == userId, cancellationToken);

        if (hasAny)
        {
            return;
        }

        var templates = CategorySeeds.All;
        var idMap = templates.ToDictionary(template => template.Id, _ => Guid.NewGuid());

        var newCategories = templates
            .OrderBy(template => template.ParentId is null ? 0 : 1)
            .Select(template => new Category
            {
                Id = idMap[template.Id],
                UserId = userId,
                Name = template.Name,
                Color = template.Color,
                Icon = template.Icon,
                ParentId = template.ParentId is Guid parentId ? idMap[parentId] : null,
                Type = template.Type,
            })
            .ToList();

        dbContext.Categories.AddRange(newCategories);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
