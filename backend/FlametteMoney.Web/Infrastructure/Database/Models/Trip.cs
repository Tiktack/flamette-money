namespace FlametteMoney.Web.Infrastructure.Database.Models;

public sealed class Trip
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? ImageUrl { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
