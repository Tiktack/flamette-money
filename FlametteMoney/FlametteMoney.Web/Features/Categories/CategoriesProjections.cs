using FlametteMoney.Web.Infrastructure.Database.Models;

namespace FlametteMoney.Web.Features.Categories;

public record CreateCategoryRequest(
    string Name,
    string Color,
    string Icon,
    Guid? ParentId,
    CategoryType Type);

public record UpdateCategoryRequest(
    string Name,
    string Color,
    string Icon,
    Guid? ParentId);

public record CategoryResponse(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    Guid? ParentId,
    IReadOnlyList<CategoryResponse> Subcategories);
