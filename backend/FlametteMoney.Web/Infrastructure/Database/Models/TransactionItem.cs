namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class TransactionItem
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal PromotionAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? SubCategoryId { get; set; }

    public Transaction Transaction { get; set; } = null!;
    public Category? Category { get; set; }
    public Category? SubCategory { get; set; }
}
