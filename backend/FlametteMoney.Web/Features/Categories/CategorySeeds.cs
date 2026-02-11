using FlametteMoney.Web.Infrastructure.Database.Models;

namespace FlametteMoney.Web.Features.Categories;

public static class CategorySeeds
{
    // ── Parent IDs ──────────────────────────────────────────────────────
    private static readonly Guid GroceriesId    = Guid.Parse("a1f1c7c7-1d3a-4a0b-930a-5e64c8b6f0b1");
    private static readonly Guid RestaurantsId  = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c7f1c2");
    private static readonly Guid HousingId      = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d39fb1");
    private static readonly Guid TransportId    = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b1885");
    private static readonly Guid ShoppingId     = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-7086eaD8g2d3".Replace("g", "0"));
    private static readonly Guid HouseholdId    = Guid.Parse("d4c4fafa-4064-7d3e-c63d-8197fb19h3e4".Replace("h", "0"));
    private static readonly Guid HealthId       = Guid.Parse("e5d50b0b-5175-8e4f-d74e-92a80c2a04f5");
    private static readonly Guid EntertainId    = Guid.Parse("f6e61c1c-6286-9f50-e85f-a3b91d3b15a6");
    private static readonly Guid EducationId    = Guid.Parse("a7f72d2d-7397-a061-f960-b4ca2e4c26b7");
    private static readonly Guid SubscriptionsId= Guid.Parse("b8083e3e-84a8-b172-0a71-c5db3f5d37c8");
    private static readonly Guid PersonalCareId = Guid.Parse("c9194f4f-95b9-c283-1b82-d6ec4060a8d9");
    private static readonly Guid GiftsId        = Guid.Parse("da2a5050-a6ca-d394-2c93-e7fd5171b9ea");
    private static readonly Guid TravelId       = Guid.Parse("eb3b6161-b7db-e4a5-3da4-f80e6282cafb");
    private static readonly Guid SalaryId       = Guid.Parse("9a7b6e52-3e36-4d92-8d1f-4b8a8f80e2ff");
    private static readonly Guid FreelanceId    = Guid.Parse("fc4c7272-c8ec-f5b6-4eb5-09100393db0c");
    private static readonly Guid InvestmentsId  = Guid.Parse("0d5d8383-d9fd-06c7-5fc6-1a2114a4ec1d");

    public static readonly Category[] All =
    [
        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Groceries
        // ════════════════════════════════════════════════════════════════
        new() { Id = GroceriesId, Name = "Groceries", Color = "#FF7043", Icon = "cart", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa9c2c"), Name = "Fruits & Vegetables", Color = "#66BB6A", Icon = "apple",  ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1001"), Name = "Dairy & Eggs",        Color = "#FFEE58", Icon = "egg",    ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1002"), Name = "Meat & Fish",         Color = "#EF5350", Icon = "meat",   ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1003"), Name = "Bread & Bakery",      Color = "#D4A373", Icon = "bread",  ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1004"), Name = "Sweets & Snacks",     Color = "#CE93D8", Icon = "candy",  ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1005"), Name = "Beverages",           Color = "#4FC3F7", Icon = "drink",  ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1006"), Name = "Alcohol",             Color = "#AB47BC", Icon = "wine",   ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1007"), Name = "Frozen Food",         Color = "#80DEEA", Icon = "frozen", ParentId = GroceriesId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c539d706-7a0d-4b5a-9a2c-8f2b4eaa1008"), Name = "Canned & Dry Goods",  Color = "#FFA726", Icon = "can",    ParentId = GroceriesId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Restaurants & Dining
        // ════════════════════════════════════════════════════════════════
        new() { Id = RestaurantsId, Name = "Restaurants", Color = "#EC407A", Icon = "restaurant", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72001"), Name = "Dine-in",    Color = "#F48FB1", Icon = "table",    ParentId = RestaurantsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72002"), Name = "Delivery",   Color = "#FF8A65", Icon = "delivery", ParentId = RestaurantsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72003"), Name = "Takeaway",   Color = "#FFB74D", Icon = "bag",      ParentId = RestaurantsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72004"), Name = "Cafes",      Color = "#A1887F", Icon = "coffee",   ParentId = RestaurantsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b2a2d8d8-2e4b-5b1c-a41b-6f75d9c72005"), Name = "Tips",       Color = "#FFD54F", Icon = "tip",      ParentId = RestaurantsId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Housing
        // ════════════════════════════════════════════════════════════════
        new() { Id = HousingId, Name = "Housing", Color = "#8D6E63", Icon = "home", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d30001"), Name = "Rent",        Color = "#A1887F", Icon = "key",       ParentId = HousingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d30002"), Name = "Utilities",   Color = "#FFB300", Icon = "bolt",      ParentId = HousingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d30003"), Name = "Internet",    Color = "#29B6F6", Icon = "wifi",      ParentId = HousingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d30004"), Name = "Maintenance", Color = "#78909C", Icon = "wrench",    ParentId = HousingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("7e2b4d17-5b3e-4fd9-a565-0f72a1d30005"), Name = "Insurance",   Color = "#7E57C2", Icon = "shield",    ParentId = HousingId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Transport
        // ════════════════════════════════════════════════════════════════
        new() { Id = TransportId, Name = "Transport", Color = "#42A5F5", Icon = "car", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0001"), Name = "Fuel",          Color = "#EF5350", Icon = "fuel",   ParentId = TransportId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0002"), Name = "Public Transit",Color = "#26A69A", Icon = "bus",    ParentId = TransportId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0003"), Name = "Taxi & Ride",   Color = "#FFA726", Icon = "taxi",   ParentId = TransportId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0004"), Name = "Parking",       Color = "#78909C", Icon = "park",   ParentId = TransportId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("2db7b5d4-6ef2-4b64-9f9e-7a5b6d0b0005"), Name = "Car Service",   Color = "#5C6BC0", Icon = "wrench", ParentId = TransportId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Shopping
        // ════════════════════════════════════════════════════════════════
        new() { Id = ShoppingId, Name = "Shopping", Color = "#AB47BC", Icon = "bag", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-708600080001"), Name = "Clothes",     Color = "#EC407A", Icon = "shirt",   ParentId = ShoppingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-708600080002"), Name = "Electronics", Color = "#42A5F5", Icon = "device",  ParentId = ShoppingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-708600080003"), Name = "Shoes",       Color = "#8D6E63", Icon = "shoe",    ParentId = ShoppingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-708600080004"), Name = "Accessories",  Color = "#FFD54F", Icon = "gem",     ParentId = ShoppingId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c3b3e9e9-3f5c-6c2d-b52c-708600080005"), Name = "Books",       Color = "#66BB6A", Icon = "book",    ParentId = ShoppingId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Household
        // ════════════════════════════════════════════════════════════════
        new() { Id = HouseholdId, Name = "Household", Color = "#26A69A", Icon = "house", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("d4c4fafa-4064-7d3e-c63d-819700190001"), Name = "Cleaning Supplies", Color = "#4FC3F7", Icon = "spray",  ParentId = HouseholdId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("d4c4fafa-4064-7d3e-c63d-819700190002"), Name = "Furniture",         Color = "#8D6E63", Icon = "chair",  ParentId = HouseholdId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("d4c4fafa-4064-7d3e-c63d-819700190003"), Name = "Garden",            Color = "#66BB6A", Icon = "plant",  ParentId = HouseholdId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("d4c4fafa-4064-7d3e-c63d-819700190004"), Name = "Kitchen Supplies",  Color = "#FF7043", Icon = "pan",    ParentId = HouseholdId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Health & Fitness
        // ════════════════════════════════════════════════════════════════
        new() { Id = HealthId, Name = "Health & Fitness", Color = "#EF5350", Icon = "heart", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("e5d50b0b-5175-8e4f-d74e-92a80c2a0001"), Name = "Pharmacy",    Color = "#E57373", Icon = "pill",    ParentId = HealthId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("e5d50b0b-5175-8e4f-d74e-92a80c2a0002"), Name = "Doctor",      Color = "#F48FB1", Icon = "medkit",  ParentId = HealthId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("e5d50b0b-5175-8e4f-d74e-92a80c2a0003"), Name = "Gym",         Color = "#FF7043", Icon = "gym",     ParentId = HealthId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("e5d50b0b-5175-8e4f-d74e-92a80c2a0004"), Name = "Sports",      Color = "#42A5F5", Icon = "sport",   ParentId = HealthId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Entertainment
        // ════════════════════════════════════════════════════════════════
        new() { Id = EntertainId, Name = "Entertainment", Color = "#FFCA28", Icon = "star", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("f6e61c1c-6286-9f50-e85f-a3b91d3b0001"), Name = "Movies & Cinema", Color = "#AB47BC", Icon = "film",   ParentId = EntertainId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("f6e61c1c-6286-9f50-e85f-a3b91d3b0002"), Name = "Games",           Color = "#5C6BC0", Icon = "game",   ParentId = EntertainId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("f6e61c1c-6286-9f50-e85f-a3b91d3b0003"), Name = "Concerts & Events",Color = "#EC407A", Icon = "music", ParentId = EntertainId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("f6e61c1c-6286-9f50-e85f-a3b91d3b0004"), Name = "Hobbies",         Color = "#66BB6A", Icon = "hobby",  ParentId = EntertainId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Education
        // ════════════════════════════════════════════════════════════════
        new() { Id = EducationId, Name = "Education", Color = "#5C6BC0", Icon = "school", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("a7f72d2d-7397-a061-f960-b4ca2e4c0001"), Name = "Courses",      Color = "#7E57C2", Icon = "course",  ParentId = EducationId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("a7f72d2d-7397-a061-f960-b4ca2e4c0002"), Name = "Textbooks",    Color = "#8D6E63", Icon = "book",    ParentId = EducationId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("a7f72d2d-7397-a061-f960-b4ca2e4c0003"), Name = "Stationery",   Color = "#FFA726", Icon = "pen",     ParentId = EducationId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Subscriptions
        // ════════════════════════════════════════════════════════════════
        new() { Id = SubscriptionsId, Name = "Subscriptions", Color = "#7E57C2", Icon = "repeat", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b8083e3e-84a8-b172-0a71-c5db3f5d0001"), Name = "Streaming",    Color = "#AB47BC", Icon = "play",    ParentId = SubscriptionsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b8083e3e-84a8-b172-0a71-c5db3f5d0002"), Name = "Software",     Color = "#42A5F5", Icon = "app",     ParentId = SubscriptionsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("b8083e3e-84a8-b172-0a71-c5db3f5d0003"), Name = "Memberships",  Color = "#FFD54F", Icon = "card",    ParentId = SubscriptionsId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Personal Care
        // ════════════════════════════════════════════════════════════════
        new() { Id = PersonalCareId, Name = "Personal Care", Color = "#F48FB1", Icon = "self", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c9194f4f-95b9-c283-1b82-d6ec40600001"), Name = "Haircut",      Color = "#CE93D8", Icon = "scissor", ParentId = PersonalCareId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("c9194f4f-95b9-c283-1b82-d6ec40600002"), Name = "Cosmetics",    Color = "#EC407A", Icon = "beauty",  ParentId = PersonalCareId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Gifts & Donations
        // ════════════════════════════════════════════════════════════════
        new() { Id = GiftsId, Name = "Gifts & Donations", Color = "#EC407A", Icon = "gift", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("da2a5050-a6ca-d394-2c93-e7fd51710001"), Name = "Gifts",      Color = "#F48FB1", Icon = "present",   ParentId = GiftsId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("da2a5050-a6ca-d394-2c93-e7fd51710002"), Name = "Charity",    Color = "#66BB6A", Icon = "heart",     ParentId = GiftsId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  EXPENSE – Travel
        // ════════════════════════════════════════════════════════════════
        new() { Id = TravelId, Name = "Travel", Color = "#26C6DA", Icon = "plane", Type = CategoryType.Expense },
        new() { Id = Guid.Parse("eb3b6161-b7db-e4a5-3da4-f80e62820001"), Name = "Flights",       Color = "#29B6F6", Icon = "plane",  ParentId = TravelId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("eb3b6161-b7db-e4a5-3da4-f80e62820002"), Name = "Hotels",        Color = "#8D6E63", Icon = "bed",    ParentId = TravelId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("eb3b6161-b7db-e4a5-3da4-f80e62820003"), Name = "Car Rental",    Color = "#42A5F5", Icon = "car",    ParentId = TravelId, Type = CategoryType.Expense },
        new() { Id = Guid.Parse("eb3b6161-b7db-e4a5-3da4-f80e62820004"), Name = "Activities",    Color = "#FFCA28", Icon = "map",    ParentId = TravelId, Type = CategoryType.Expense },

        // ════════════════════════════════════════════════════════════════
        //  INCOME
        // ════════════════════════════════════════════════════════════════
        new() { Id = SalaryId, Name = "Salary", Color = "#66BB6A", Icon = "salary", Type = CategoryType.Income },
        new() { Id = Guid.Parse("9a7b6e52-3e36-4d92-8d1f-4b8a8f800001"), Name = "Base Pay",  Color = "#81C784", Icon = "money", ParentId = SalaryId, Type = CategoryType.Income },
        new() { Id = Guid.Parse("9a7b6e52-3e36-4d92-8d1f-4b8a8f800002"), Name = "Bonus",     Color = "#FFD54F", Icon = "star",  ParentId = SalaryId, Type = CategoryType.Income },

        new() { Id = FreelanceId, Name = "Freelance", Color = "#29B6F6", Icon = "laptop", Type = CategoryType.Income },
        new() { Id = Guid.Parse("fc4c7272-c8ec-f5b6-4eb5-091003930001"), Name = "Consulting",  Color = "#4FC3F7", Icon = "brief", ParentId = FreelanceId, Type = CategoryType.Income },
        new() { Id = Guid.Parse("fc4c7272-c8ec-f5b6-4eb5-091003930002"), Name = "Side Projects",Color = "#81D4FA", Icon = "code", ParentId = FreelanceId, Type = CategoryType.Income },

        new() { Id = InvestmentsId, Name = "Investments", Color = "#FFA726", Icon = "chart", Type = CategoryType.Income },
        new() { Id = Guid.Parse("0d5d8383-d9fd-06c7-5fc6-1a2114a40001"), Name = "Dividends",  Color = "#FFB74D", Icon = "coin",   ParentId = InvestmentsId, Type = CategoryType.Income },
        new() { Id = Guid.Parse("0d5d8383-d9fd-06c7-5fc6-1a2114a40002"), Name = "Interest",   Color = "#FFCC80", Icon = "percent",ParentId = InvestmentsId, Type = CategoryType.Income },
    ];
}
