using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class TransactionItemConfiguration : IEntityTypeConfiguration<TransactionItem>
{
    public void Configure(EntityTypeBuilder<TransactionItem> builder)
    {
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Name).IsRequired().HasMaxLength(300);
        builder.Property(item => item.Quantity).HasPrecision(18, 4);
        builder.Property(item => item.UnitPrice).HasPrecision(18, 2);
        builder.Property(item => item.PromotionAmount).HasPrecision(18, 2);
        builder.Property(item => item.FinalAmount).HasPrecision(18, 2);
        builder.Property(item => item.Unit).HasMaxLength(50);

        builder.HasOne(item => item.Transaction)
            .WithMany(transaction => transaction.Items)
            .HasForeignKey(item => item.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(item => item.Category)
            .WithMany()
            .HasForeignKey(item => item.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(item => item.SubCategory)
            .WithMany()
            .HasForeignKey(item => item.SubCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
