using FlametteMoney.Web.Features.Categories;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(category => category.Id);
        builder.Property(category => category.UserId).IsRequired();
        builder.Property(category => category.Name).HasMaxLength(200).IsRequired();
        builder.Property(category => category.Color).HasMaxLength(20).IsRequired();
        builder.Property(category => category.Icon).HasMaxLength(100).IsRequired();
        builder.Property(category => category.Type).IsRequired();

        builder.HasOne(category => category.User)
            .WithMany(user => user.Categories)
            .HasForeignKey(category => category.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(category => category.Parent)
            .WithMany(category => category.Children)
            .HasForeignKey(category => category.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(category => new { category.UserId, category.Name });
        builder.HasIndex(category => new { category.UserId, category.Type, category.ParentId });

        builder.HasData(CategorySeeds.All);
    }
}
