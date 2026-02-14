using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionDualCurrencyFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Amount2",
                table: "Transactions",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Transactions",
                type: "TEXT",
                maxLength: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency2",
                table: "Transactions",
                type: "TEXT",
                maxLength: 3,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Amount2",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Currency2",
                table: "Transactions");
        }
    }
}
