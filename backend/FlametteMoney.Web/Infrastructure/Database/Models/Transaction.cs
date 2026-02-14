namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Transaction : IUserOwnedEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime Date { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal? Amount2 { get; set; }
    public string? Currency { get; set; }
    public string? Currency2 { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? SubCategoryId { get; set; }
    public Guid? TargetAccountId { get; set; }
    public Guid? RelatedTransactionId { get; set; }
    public Guid? OriginalTransactionId { get; set; }
    public Guid? TripId { get; set; }
    public bool IsRefund { get; set; }
    public string? Note { get; set; }
    public string? MerchantName { get; set; }
    public string? Location { get; set; }

    public User User { get; set; } = null!;
    public Account Account { get; set; } = null!;
    public Account? TargetAccount { get; set; }
    public Category? Category { get; set; }
    public Category? SubCategory { get; set; }
    public Trip? Trip { get; set; }
    public ICollection<TransactionItem> Items { get; set; } = new List<TransactionItem>();
}

public enum TransactionType
{
    Income = 1,
    Expense = 2,
    Transfer = 3,
    Refund = 4
}
