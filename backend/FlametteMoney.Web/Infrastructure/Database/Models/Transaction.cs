namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Transaction
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? SubCategoryId { get; set; }
    public Guid? TargetAccountId { get; set; }
    public Guid? RelatedTransactionId { get; set; }
    public Guid? OriginalTransactionId { get; set; }
    public bool IsRefund { get; set; }
    public string? Note { get; set; }
    public string? MerchantName { get; set; }
    public string? Location { get; set; }

    public Account Account { get; set; } = null!;
    public Account? TargetAccount { get; set; }
    public Category? Category { get; set; }
    public Category? SubCategory { get; set; }
}

public enum TransactionType
{
    Income = 1,
    Expense = 2,
    Transfer = 3,
    Refund = 4
}
