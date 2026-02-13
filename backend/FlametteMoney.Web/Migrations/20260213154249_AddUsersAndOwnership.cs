using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersAndOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Trips_Name",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_StartDate",
                table: "Trips");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Trips",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Transactions",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Accounts",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 320, nullable: false),
                    GoogleSubject = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SubscriptionType = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "Name", "Email", "GoogleSubject", "SubscriptionType" },
                values: new object[]
                {
                    new Guid("00000000-0000-0000-0000-000000000000"),
                    "Legacy User",
                    "legacy@local",
                    "legacy-subject",
                    1
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trips_UserId_Name",
                table: "Trips",
                columns: new[] { "UserId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Trips_UserId_StartDate",
                table: "Trips",
                columns: new[] { "UserId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_AccountId_Date",
                table: "Transactions",
                columns: new[] { "UserId", "AccountId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_CategoryId_Date",
                table: "Transactions",
                columns: new[] { "UserId", "CategoryId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_Date",
                table: "Transactions",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_TripId_Date",
                table: "Transactions",
                columns: new[] { "UserId", "TripId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId_Name",
                table: "Accounts",
                columns: new[] { "UserId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId_Type",
                table: "Accounts",
                columns: new[] { "UserId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleSubject",
                table: "Users",
                column: "GoogleSubject",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Users_UserId",
                table: "Accounts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_Users_UserId",
                table: "Trips",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Users_UserId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Trips_Users_UserId",
                table: "Trips");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Trips_UserId_Name",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_UserId_StartDate",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId_AccountId_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId_CategoryId_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId_TripId_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_UserId_Name",
                table: "Accounts");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_UserId_Type",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Accounts");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_Name",
                table: "Trips",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_StartDate",
                table: "Trips",
                column: "StartDate");
        }
    }
}
