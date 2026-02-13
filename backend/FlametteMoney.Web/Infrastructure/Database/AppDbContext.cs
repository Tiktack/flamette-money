using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Infrastructure.Database;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserContext currentUserContext) : DbContext(options)
{
    private Guid? CurrentUserId => currentUserContext.UserId;

    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionItem> TransactionItems => Set<TransactionItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Account>()
            .HasQueryFilter(account => CurrentUserId.HasValue && account.UserId == CurrentUserId.Value);

        modelBuilder.Entity<Category>()
            .HasQueryFilter(category => CurrentUserId.HasValue && category.UserId == CurrentUserId.Value);

        modelBuilder.Entity<Trip>()
            .HasQueryFilter(trip => CurrentUserId.HasValue && trip.UserId == CurrentUserId.Value);

        modelBuilder.Entity<Transaction>()
            .HasQueryFilter(transaction => CurrentUserId.HasValue && transaction.UserId == CurrentUserId.Value);

        modelBuilder.Entity<TransactionItem>()
            .HasQueryFilter(item => CurrentUserId.HasValue && item.Transaction.UserId == CurrentUserId.Value);
    }

    public override int SaveChanges()
    {
        ApplyUserOwnership();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyUserOwnership();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyUserOwnership();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyUserOwnership();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ApplyUserOwnership()
    {
        if (!CurrentUserId.HasValue)
        {
            return;
        }

        foreach (var entry in ChangeTracker.Entries<IUserOwnedEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.UserId == Guid.Empty)
            {
                entry.Entity.UserId = CurrentUserId.Value;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Property(nameof(IUserOwnedEntity.UserId)).IsModified = false;
            }
        }
    }
}
