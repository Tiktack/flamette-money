using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddTrips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TripId",
                table: "Transactions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Trips",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trips", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TripId",
                table: "Transactions",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_Name",
                table: "Trips",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_StartDate",
                table: "Trips",
                column: "StartDate");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Trips_TripId",
                table: "Transactions",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Trips_TripId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_TripId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "TripId",
                table: "Transactions");
        }
    }
}
