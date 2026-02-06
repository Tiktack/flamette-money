using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class AdvancedTransactionsAndSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "CategoryId",
                table: "Transactions",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AddColumn<bool>(
                name: "IsRefund",
                table: "Transactions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Transactions",
                type: "TEXT",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MerchantName",
                table: "Transactions",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OriginalTransactionId",
                table: "Transactions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RelatedTransactionId",
                table: "Transactions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TargetAccountId",
                table: "Transactions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_OriginalTransactionId",
                table: "Transactions",
                column: "OriginalTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_RelatedTransactionId",
                table: "Transactions",
                column: "RelatedTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TargetAccountId",
                table: "Transactions",
                column: "TargetAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Accounts_TargetAccountId",
                table: "Transactions",
                column: "TargetAccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Transactions_OriginalTransactionId",
                table: "Transactions",
                column: "OriginalTransactionId",
                principalTable: "Transactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Transactions_RelatedTransactionId",
                table: "Transactions",
                column: "RelatedTransactionId",
                principalTable: "Transactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Accounts_TargetAccountId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Transactions_OriginalTransactionId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Transactions_RelatedTransactionId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_OriginalTransactionId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_RelatedTransactionId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_TargetAccountId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "IsRefund",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "MerchantName",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "OriginalTransactionId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "RelatedTransactionId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "TargetAccountId",
                table: "Transactions");

            migrationBuilder.AlterColumn<Guid>(
                name: "CategoryId",
                table: "Transactions",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);
        }
    }
}
