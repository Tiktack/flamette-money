using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.HasKey(account => account.Id);
        builder.Property(account => account.Name).HasMaxLength(200).IsRequired();
        builder.Property(account => account.Currency).HasMaxLength(3).IsRequired();
        builder.Property(account => account.Color).HasMaxLength(7).IsRequired();
        builder.Property(account => account.InitialBalance).HasPrecision(18, 2);
        builder.Property(account => account.CurrentBalance).HasPrecision(18, 2);
        builder.Property(account => account.Type).IsRequired();
    }
}
