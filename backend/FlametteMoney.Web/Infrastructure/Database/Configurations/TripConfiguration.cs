using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlametteMoney.Web.Infrastructure.Database.Configurations;

public sealed class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.HasKey(trip => trip.Id);
        builder.Property(trip => trip.UserId).IsRequired();
        builder.Property(trip => trip.Name).HasMaxLength(200).IsRequired();
        builder.Property(trip => trip.Country).HasMaxLength(2);
        builder.Property(trip => trip.ImageUrl).HasMaxLength(1000);

        builder.HasOne(trip => trip.User)
            .WithMany(user => user.Trips)
            .HasForeignKey(trip => trip.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(trip => new { trip.UserId, trip.Name });
        builder.HasIndex(trip => new { trip.UserId, trip.StartDate });
    }
}
