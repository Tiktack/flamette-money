using FlametteMoney.Web.Infrastructure.Database.Models;

namespace FlametteMoney.Web.Features.Categories;

public static class CategorySeeds
{
    public static readonly Category[] All =
    [
        new Category
        {
            Id = Guid.Parse("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"),
            Name = "Food",
            Color = "#FF7043",
            Icon = "food",
            Type = CategoryType.Expense
        },
        new Category
        {
            Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa9c2c"),
            Name = "Groceries",
            Color = "#FFA726",
            Icon = "cart",
            ParentId = Guid.Parse("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"),
            Type = CategoryType.Expense
        },
        new Category
        {
            Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"),
            Name = "Housing",
            Color = "#8D6E63",
            Icon = "home",
            Type = CategoryType.Expense
        },
        new Category
        {
            Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"),
            Name = "Transport",
            Color = "#42A5F5",
            Icon = "car",
            Type = CategoryType.Expense
        },
        new Category
        {
            Id = Guid.Parse("9a7b6e52-3e36-4d92-8d1f-4b8a8f80e2ff"),
            Name = "Salary",
            Color = "#66BB6A",
            Icon = "salary",
            Type = CategoryType.Income
        }
    ];
}
