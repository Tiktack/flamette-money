using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.HasKey(trip => trip.Id);
        builder.Property(trip => trip.Name).HasMaxLength(200).IsRequired();
        builder.Property(trip => trip.ImageUrl).HasMaxLength(1000);

        builder.HasIndex(trip => trip.Name);
        builder.HasIndex(trip => trip.StartDate);
    }
}
