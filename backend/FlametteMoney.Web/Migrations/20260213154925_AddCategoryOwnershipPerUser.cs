using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryOwnershipPerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Categories",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0005"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30005"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f80e2ff"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72005"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080005"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1005"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1006"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1007"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1008"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa9c2c"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec40600001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec40600002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec4060a8d9"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd51710001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd51710002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd5171b9ea"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0003"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0004"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930001"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930002"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-09100393db0c"),
                column: "UserId",
                value: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Categories_UserId_Name",
                table: "Categories",
                columns: new[] { "UserId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_UserId_Type_ParentId",
                table: "Categories",
                columns: new[] { "UserId", "Type", "ParentId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Users_UserId",
                table: "Categories",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Users_UserId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_UserId_Name",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_UserId_Type_ParentId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Categories");
        }
    }
}
