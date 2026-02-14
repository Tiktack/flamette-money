namespace FlametteMoney.Web.Infrastructure.Database.Models;

public interface IUserOwnedEntity
{
    Guid UserId { get; set; }
}

public sealed class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string GoogleSubject { get; set; } = string.Empty;
    public string BaseCurrency { get; set; } = "USD";
    public SubscriptionType SubscriptionType { get; set; } = SubscriptionType.Free;

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public enum SubscriptionType
{
    Free = 1,
    Premium = 2
}
