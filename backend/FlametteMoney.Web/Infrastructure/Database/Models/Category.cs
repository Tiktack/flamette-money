namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Category : IUserOwnedEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#000000";
    public string Icon { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public CategoryType Type { get; set; }

    public User User { get; set; } = null!;
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public enum CategoryType
{
    Income = 1,
    Expense = 2
}
