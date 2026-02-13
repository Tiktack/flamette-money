using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class SyncCategorySeedsAfterTrips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "Icon", "Name", "ParentId", "Type" },
                values: new object[,]
                {
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), "#26C6DA", "plane", "Travel", null, 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820001"), "#29B6F6", "plane", "Flights", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820002"), "#8D6E63", "bed", "Hotels", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820003"), "#42A5F5", "car", "Car Rental", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820004"), "#FFCA28", "map", "Activities", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 }
                });
        }
    }
}
