using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.HasKey(transaction => transaction.Id);
        builder.Property(transaction => transaction.Amount).HasPrecision(18, 2);
        builder.Property(transaction => transaction.Type).IsRequired();
        builder.Property(transaction => transaction.Date).IsRequired();
        builder.Property(transaction => transaction.MerchantName).HasMaxLength(200);
        builder.Property(transaction => transaction.Location).HasMaxLength(400);

        builder.HasOne(transaction => transaction.Account)
            .WithMany(account => account.Transactions)
            .HasForeignKey(transaction => transaction.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(transaction => transaction.TargetAccount)
            .WithMany()
            .HasForeignKey(transaction => transaction.TargetAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(transaction => transaction.Category)
            .WithMany(category => category.Transactions)
            .HasForeignKey(transaction => transaction.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(transaction => transaction.SubCategory)
            .WithMany()
            .HasForeignKey(transaction => transaction.SubCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Transaction>()
            .WithMany()
            .HasForeignKey(transaction => transaction.RelatedTransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Transaction>()
            .WithMany()
            .HasForeignKey(transaction => transaction.OriginalTransactionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
