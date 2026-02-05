namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Transaction
{
    public Guid Id { get; set; }
    public DateTimeOffset Date { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public Guid AccountId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? SubCategoryId { get; set; }
    public string? Note { get; set; }

    public Account Account { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public Category? SubCategory { get; set; }
}

public enum TransactionType
{
    Income = 1,
    Expense = 2
}
