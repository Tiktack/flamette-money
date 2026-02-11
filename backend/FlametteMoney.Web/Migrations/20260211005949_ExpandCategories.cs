using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FlametteMoney.Web.Migrations
{
    /// <inheritdoc />
    public partial class ExpandCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"),
                columns: new[] { "Icon", "Name" },
                values: new object[] { "cart", "Groceries" });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa9c2c"),
                columns: new[] { "Color", "Icon", "Name" },
                values: new object[] { "#66BB6A", "apple", "Fruits & Vegetables" });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "Icon", "Name", "ParentId", "Type" },
                values: new object[,]
                {
                    { new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d"), "#FFA726", "chart", "Investments", null, 1 },
                    { new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0001"), "#EF5350", "fuel", "Fuel", new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"), 2 },
                    { new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0002"), "#26A69A", "bus", "Public Transit", new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"), 2 },
                    { new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0003"), "#FFA726", "taxi", "Taxi & Ride", new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"), 2 },
                    { new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0004"), "#78909C", "park", "Parking", new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"), 2 },
                    { new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0005"), "#5C6BC0", "wrench", "Car Service", new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885"), 2 },
                    { new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30001"), "#A1887F", "key", "Rent", new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"), 2 },
                    { new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30002"), "#FFB300", "bolt", "Utilities", new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"), 2 },
                    { new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30003"), "#29B6F6", "wifi", "Internet", new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"), 2 },
                    { new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30004"), "#78909C", "wrench", "Maintenance", new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"), 2 },
                    { new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30005"), "#7E57C2", "shield", "Insurance", new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1"), 2 },
                    { new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800001"), "#81C784", "money", "Base Pay", new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f80e2ff"), 1 },
                    { new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800002"), "#FFD54F", "star", "Bonus", new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f80e2ff"), 1 },
                    { new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"), "#5C6BC0", "school", "Education", null, 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), "#EC407A", "restaurant", "Restaurants", null, 2 },
                    { new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"), "#7E57C2", "repeat", "Subscriptions", null, 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), "#AB47BC", "bag", "Shopping", null, 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1001"), "#FFEE58", "egg", "Dairy & Eggs", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1002"), "#EF5350", "meat", "Meat & Fish", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1003"), "#D4A373", "bread", "Bread & Bakery", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1004"), "#CE93D8", "candy", "Sweets & Snacks", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1005"), "#4FC3F7", "drink", "Beverages", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1006"), "#AB47BC", "wine", "Alcohol", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1007"), "#80DEEA", "frozen", "Frozen Food", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1008"), "#FFA726", "can", "Canned & Dry Goods", new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"), 2 },
                    { new Guid("c9194f4f-95b9-c283-1b82-d6ec4060a8d9"), "#F48FB1", "self", "Personal Care", null, 2 },
                    { new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"), "#26A69A", "house", "Household", null, 2 },
                    { new Guid("da2a5050-a6ca-d394-2c93-e7fd5171b9ea"), "#EC407A", "gift", "Gifts & Donations", null, 2 },
                    { new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"), "#EF5350", "heart", "Health & Fitness", null, 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), "#26C6DA", "plane", "Travel", null, 2 },
                    { new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"), "#FFCA28", "star", "Entertainment", null, 2 },
                    { new Guid("fc4c7272-c8ec-f5b6-4eb5-09100393db0c"), "#29B6F6", "laptop", "Freelance", null, 1 },
                    { new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40001"), "#FFB74D", "coin", "Dividends", new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d"), 1 },
                    { new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40002"), "#FFCC80", "percent", "Interest", new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d"), 1 },
                    { new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0001"), "#7E57C2", "course", "Courses", new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"), 2 },
                    { new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0002"), "#8D6E63", "book", "Textbooks", new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"), 2 },
                    { new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0003"), "#FFA726", "pen", "Stationery", new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"), 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72001"), "#F48FB1", "table", "Dine-in", new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72002"), "#FF8A65", "delivery", "Delivery", new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72003"), "#FFB74D", "bag", "Takeaway", new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72004"), "#A1887F", "coffee", "Cafes", new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), 2 },
                    { new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72005"), "#FFD54F", "tip", "Tips", new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"), 2 },
                    { new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0001"), "#AB47BC", "play", "Streaming", new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"), 2 },
                    { new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0002"), "#42A5F5", "app", "Software", new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"), 2 },
                    { new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0003"), "#FFD54F", "card", "Memberships", new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"), 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080001"), "#EC407A", "shirt", "Clothes", new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080002"), "#42A5F5", "device", "Electronics", new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080003"), "#8D6E63", "shoe", "Shoes", new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080004"), "#FFD54F", "gem", "Accessories", new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), 2 },
                    { new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080005"), "#66BB6A", "book", "Books", new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"), 2 },
                    { new Guid("c9194f4f-95b9-c283-1b82-d6ec40600001"), "#CE93D8", "scissor", "Haircut", new Guid("c9194f4f-95b9-c283-1b82-d6ec4060a8d9"), 2 },
                    { new Guid("c9194f4f-95b9-c283-1b82-d6ec40600002"), "#EC407A", "beauty", "Cosmetics", new Guid("c9194f4f-95b9-c283-1b82-d6ec4060a8d9"), 2 },
                    { new Guid("d4c4fafa-4064-7d3e-c63d-819700190001"), "#4FC3F7", "spray", "Cleaning Supplies", new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"), 2 },
                    { new Guid("d4c4fafa-4064-7d3e-c63d-819700190002"), "#8D6E63", "chair", "Furniture", new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"), 2 },
                    { new Guid("d4c4fafa-4064-7d3e-c63d-819700190003"), "#66BB6A", "plant", "Garden", new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"), 2 },
                    { new Guid("d4c4fafa-4064-7d3e-c63d-819700190004"), "#FF7043", "pan", "Kitchen Supplies", new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"), 2 },
                    { new Guid("da2a5050-a6ca-d394-2c93-e7fd51710001"), "#F48FB1", "present", "Gifts", new Guid("da2a5050-a6ca-d394-2c93-e7fd5171b9ea"), 2 },
                    { new Guid("da2a5050-a6ca-d394-2c93-e7fd51710002"), "#66BB6A", "heart", "Charity", new Guid("da2a5050-a6ca-d394-2c93-e7fd5171b9ea"), 2 },
                    { new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0001"), "#E57373", "pill", "Pharmacy", new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"), 2 },
                    { new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0002"), "#F48FB1", "medkit", "Doctor", new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"), 2 },
                    { new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0003"), "#FF7043", "gym", "Gym", new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"), 2 },
                    { new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0004"), "#42A5F5", "sport", "Sports", new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820001"), "#29B6F6", "plane", "Flights", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820002"), "#8D6E63", "bed", "Hotels", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820003"), "#42A5F5", "car", "Car Rental", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("eb3b6161-b7db-e4a5-3da4-f80e62820004"), "#FFCA28", "map", "Activities", new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"), 2 },
                    { new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0001"), "#AB47BC", "film", "Movies & Cinema", new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"), 2 },
                    { new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0002"), "#5C6BC0", "game", "Games", new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"), 2 },
                    { new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0003"), "#EC407A", "music", "Concerts & Events", new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"), 2 },
                    { new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0004"), "#66BB6A", "hobby", "Hobbies", new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"), 2 },
                    { new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930001"), "#4FC3F7", "brief", "Consulting", new Guid("fc4c7272-c8ec-f5b6-4eb5-09100393db0c"), 1 },
                    { new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930002"), "#81D4FA", "code", "Side Projects", new Guid("fc4c7272-c8ec-f5b6-4eb5-09100393db0c"), 1 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a40002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0005"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("7e2b4d17-5b3e-4fd9-a565-0f72a1d30005"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("9a7b6e52-3e36-4d92-8d1f-4b8a8f800002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c0003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72005"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d0003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-708600080005"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1005"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1006"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1007"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1008"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec40600001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec40600002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-819700190004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd51710001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd51710002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a0004"));

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
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0003"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b0004"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930001"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-091003930002"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a7f72d2d-7397-a061-f960-b4ca2e4c26b7"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b8083e3e-84a8-b172-0a71-c5db3f5d37c8"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c3b3e9e9-3f5c-6c2d-b52c-7086ead802d3"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c9194f4f-95b9-c283-1b82-d6ec4060a8d9"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("d4c4fafa-4064-7d3e-c63d-8197fb1903e4"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("da2a5050-a6ca-d394-2c93-e7fd5171b9ea"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("eb3b6161-b7db-e4a5-3da4-f80e6282cafb"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("fc4c7272-c8ec-f5b6-4eb5-09100393db0c"));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1"),
                columns: new[] { "Icon", "Name" },
                values: new object[] { "food", "Food" });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c539d706-7a0d-4b5a-9a2c-8f2b4eaa9c2c"),
                columns: new[] { "Color", "Icon", "Name" },
                values: new object[] { "#FFA726", "cart", "Groceries" });
        }
    }
}
