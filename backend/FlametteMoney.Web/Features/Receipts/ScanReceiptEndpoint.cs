using Carter;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mscc.GenerativeAI;
using Mscc.GenerativeAI.Types;
using System.Text.Json;

namespace FlametteMoney.Web.Features.Receipts;

public record ReceiptItemResponse(
    string Name,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal PromotionAmount,
    decimal FinalAmount,
    string? CategoryName,
    Guid? CategoryId,
    Guid? SubCategoryId);

public record ScanReceiptResponse(
    string? Merchant,
    DateTime? Date,
    decimal Amount,
    string? Currency,
    List<ReceiptItemResponse> Items);

public sealed class ScanReceiptEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/receipts/scan", Handle)
            .WithTags("Receipts")
            .WithSummary("Scan receipt")
            .WithDescription("Upload a receipt image and return a draft transaction with categorized items using AI.")
            .DisableAntiforgery()
            .Produces<ScanReceiptResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);
    }

    private static async Task<Results<Ok<ScanReceiptResponse>, BadRequest<string>>> Handle(
        IFormFile file,
        [FromForm] Guid accountId,
        [FromServices] AppDbContext dbContext,
        [FromServices] IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return TypedResults.BadRequest("No image file was uploaded.");
        }

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/heic" };
        if (!allowedTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return TypedResults.BadRequest("Only JPEG, PNG, WebP, and HEIC images are supported.");
        }

        var apiKey = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return TypedResults.BadRequest("Gemini API key is not configured. Set Gemini:ApiKey in appsettings or user secrets.");
        }

        var account = await dbContext.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return TypedResults.BadRequest("Account not found.");
        }

        var categories = await dbContext.Categories
            .AsNoTracking()
            .Include(c => c.Children)
            .Where(c => c.ParentId == null)
            .ToListAsync(cancellationToken);

        var categoryList = BuildCategoryPromptList(categories);

        byte[] imageBytes;
        using (var memoryStream = new MemoryStream())
        {
            await file.CopyToAsync(memoryStream, cancellationToken);
            imageBytes = memoryStream.ToArray();
        }

        var prompt = BuildPrompt(categoryList);

        try
        {
            var googleAi = new GoogleAI(apiKey);
            var model = googleAi.GenerativeModel(model: Mscc.GenerativeAI.Types.Model.Gemini20Flash);

            var base64Image = Convert.ToBase64String(imageBytes);
            var request = new GenerateContentRequest(prompt)
            {
                GenerationConfig = new GenerationConfig
                {
                    Temperature = 0.1f,
                    ResponseMimeType = "application/json"
                }
            };
            await request.AddMedia(base64Image, file.ContentType);

            var response = await model.GenerateContent(request);
            var jsonText = response?.Text?.Trim();

            if (string.IsNullOrWhiteSpace(jsonText))
            {
                return TypedResults.BadRequest("AI could not parse the receipt. Please try a clearer image.");
            }

            var aiResult = JsonSerializer.Deserialize<AiReceiptResult>(jsonText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (aiResult is null)
            {
                return TypedResults.BadRequest("AI returned an invalid response. Please try again.");
            }

            var scanResponse = BuildDraftFromReceipt(aiResult, account, categories);
            return TypedResults.Ok(scanResponse);
        }
        catch (Exception ex)
        {
            return TypedResults.BadRequest($"AI processing failed: {ex.Message}");
        }
    }

    private static string BuildCategoryPromptList(List<Category> categories)
    {
        var lines = new List<string>();
        foreach (var category in categories)
        {
            var subcategories = category.Children?.Select(c => c.Name).ToList() ?? [];
            if (subcategories.Count > 0)
            {
                lines.Add($"  - \"{category.Name}\" ({category.Type}) -- valid subcategories: {string.Join(", ", subcategories.Select(s => $"\"{s}\""))}");
            }
            else
            {
                lines.Add($"  - \"{category.Name}\" ({category.Type}) -- no subcategories");
            }
        }
        return string.Join("\n", lines);
    }

    private static string BuildPrompt(string categoryList)
    {
        return $$"""
            You are a receipt parsing assistant. Analyze the attached receipt image carefully.

            Extract the following information and return it as JSON:
            1. merchant - The store/merchant name
            2. date - The transaction date (ISO 8601 format: YYYY-MM-DD)
            3. amount - The total amount paid
            4. currency - The currency code (e.g., USD, EUR, GBP, PLN)
            5. items - Array of line items found on the receipt

            For each item, extract:
            - name: Item description
            - quantity: Number of units (default 1 if not specified)
            - unit: Unit of measurement (e.g., "pcs", "kg", "lb") or null
            - unitPrice: Price per unit
            - promotionAmount: Any discount applied to this item (0 if none)
            - finalAmount: The final price after discount (unitPrice * quantity - promotionAmount)
            - category: The EXACT parent category name from the list below (MUST match exactly, character by character)
            - subcategory: The EXACT subcategory name from the list below, or null if none matches (MUST match exactly, character by character)

            AVAILABLE CATEGORIES AND SUBCATEGORIES (use ONLY these exact strings):
            {{categoryList}}

            STRICT RULES FOR CATEGORY ASSIGNMENT:
            - You MUST ONLY use category and subcategory names that appear EXACTLY in the list above.
            - DO NOT invent, create, or modify category names. Copy them character-for-character.
            - If an item does not clearly fit any category, set category to the closest parent category and subcategory to null.
            - The "category" field must be a parent category name (the name before the parentheses).
            - The "subcategory" field must be one of the listed subcategory names for that parent, or null.
            - If a subcategory matches but belongs to a different parent, use the correct parent for that subcategory.
            - Tax, charges, bags, and service fees: assign to the most relevant parent category, subcategory null.

            Return ONLY valid JSON in this exact structure (no markdown, no commentary):
            {
              "merchant": "Store Name",
              "date": "2026-02-11",
              "amount": 25.50,
              "currency": "USD",
              "items": [
                {
                  "name": "Item Name",
                  "quantity": 1,
                  "unit": "pcs",
                  "unitPrice": 3.99,
                  "promotionAmount": 0,
                  "finalAmount": 3.99,
                  "category": "Groceries",
                  "subcategory": "Fruits & Vegetables"
                }
              ]
            }
            """;
    }

    private static ScanReceiptResponse BuildDraftFromReceipt(
        AiReceiptResult aiResult,
        Account account,
        List<Category> categories)
    {
        var categoryLookup = new Dictionary<string, (Guid Id, Guid? ParentId, CategoryType Type)>(StringComparer.OrdinalIgnoreCase);
        foreach (var category in categories)
        {
            categoryLookup[category.Name] = (category.Id, null, category.Type);
            foreach (var child in category.Children ?? [])
            {
                categoryLookup[child.Name] = (child.Id, category.Id, child.Type);
            }
        }

        var transactionItems = new List<TransactionItem>();
        var responseItems = new List<ReceiptItemResponse>();

        foreach (var item in aiResult.Items ?? [])
        {
            Guid? categoryId = null;
            Guid? subCategoryId = null;
            string? categoryName = item.Category;

            // Try subcategory first
            if (!string.IsNullOrWhiteSpace(item.Subcategory) && categoryLookup.TryGetValue(item.Subcategory, out var subMatch))
            {
                if (subMatch.ParentId is not null)
                {
                    categoryId = subMatch.ParentId;
                    subCategoryId = subMatch.Id;
                }
                else
                {
                    categoryId = subMatch.Id;
                }
            }
            // Fall back to category
            else if (!string.IsNullOrWhiteSpace(item.Category) && categoryLookup.TryGetValue(item.Category, out var catMatch))
            {
                if (catMatch.ParentId is not null)
                {
                    categoryId = catMatch.ParentId;
                    subCategoryId = catMatch.Id;
                }
                else
                {
                    categoryId = catMatch.Id;
                }
            }

            var quantity = item.Quantity > 0 ? item.Quantity : 1;
            var unitPrice = item.UnitPrice;
            var promo = item.PromotionAmount;
            var finalAmount = item.FinalAmount > 0
                ? item.FinalAmount
                : (unitPrice * quantity) - promo;

            var txItem = new TransactionItem
            {
                Id = Guid.NewGuid(),
                Name = item.Name ?? "Unknown item",
                Quantity = quantity,
                Unit = item.Unit,
                UnitPrice = unitPrice,
                PromotionAmount = promo,
                FinalAmount = finalAmount,
                CategoryId = categoryId,
                SubCategoryId = subCategoryId
            };
            transactionItems.Add(txItem);

            responseItems.Add(new ReceiptItemResponse(
                txItem.Name,
                quantity,
                item.Unit,
                unitPrice,
                promo,
                finalAmount,
                categoryName,
                categoryId,
                subCategoryId));
        }

        var totalAmount = aiResult.Amount > 0 ? aiResult.Amount : transactionItems.Sum(i => i.FinalAmount);

        DateTime transactionDate;
        if (DateTime.TryParse(aiResult.Date, out var dt))
        {
            transactionDate = dt;
        }
        else
        {
            transactionDate = DateTime.UtcNow;
        }

        return new ScanReceiptResponse(
            aiResult.Merchant,
            transactionDate,
            totalAmount,
            SupportedCurrencies.NormalizeOrDefault(aiResult.Currency, account.Currency),
            responseItems);
    }
}

internal sealed class AiReceiptResult
{
    public string? Merchant { get; set; }
    public string? Date { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public List<AiReceiptItem>? Items { get; set; }
}

internal sealed class AiReceiptItem
{
    public string? Name { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal PromotionAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string? Category { get; set; }
    public string? Subcategory { get; set; }
}
