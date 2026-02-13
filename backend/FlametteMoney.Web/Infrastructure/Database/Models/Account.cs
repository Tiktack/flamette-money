namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Account : IUserOwnedEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "USD";
    public string Color { get; set; } = "#4C6EF5";
    public AccountType Type { get; set; }
    public decimal InitialBalance { get; set; }
    public decimal CurrentBalance { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public enum AccountType
{
    Cash = 1,
    DebitCard = 2,
    CreditCard = 3,
    Savings = 4
}
