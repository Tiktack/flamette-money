using ClosedXML.Excel;
using EFCore.BulkExtensions;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace FlametteMoney.Web.Features.Profile;

public sealed record FlametteImportResult(
    int ImportedTransactions,
    int ImportedAccounts,
    int ImportedCategories,
    int ImportedSubCategories,
    int ImportedTransactionItems,
    int UpdatedSettings,
    int UpdatedBalanceSnapshots,
    int SkippedRows);

internal static class FlametteBackupPorter
{
    private const string SupportedType = "flamette";
    private const string Format = "flamette-money-backup";
    private const int CurrentVersion = 1;

    private const string SettingsSheet = "Settings";
    private const string AccountsSheet = "Accounts";
    private const string CategoriesSheet = "Categories";
    private const string TransactionsSheet = "Transactions";
    private const string TransactionItemsSheet = "TransactionItems";

    public static bool IsSupportedType(string? type)
    {
        return string.Equals(type?.Trim(), SupportedType, StringComparison.OrdinalIgnoreCase);
    }

    public static async Task<byte[]> ExportAsync(
        AppDbContext dbContext,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);

        if (user is null)
        {
            throw new InvalidOperationException("User profile was not found.");
        }

        var accounts = await dbContext.Accounts
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(item => item.ParentId.HasValue)
            .ThenBy(item => item.Name)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);

        var transactions = await dbContext.Transactions
            .AsNoTracking()
            .Include(item => item.Items)
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();

        WriteSettingsSheet(workbook, user.BaseCurrency);
        WriteAccountsSheet(workbook, accounts);
        WriteCategoriesSheet(workbook, categories);
        WriteTransactionsSheet(workbook, transactions);
        WriteTransactionItemsSheet(workbook, transactions.SelectMany(item => item.Items).ToList());

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public static async Task<FlametteImportResult> ImportAsync(
        Stream stream,
        AppDbContext dbContext,
        Guid userId,
        CancellationToken cancellationToken)
    {
        using var workbook = new XLWorkbook(stream);

        var settings = ReadSettings(workbook);
        ValidateSettings(settings);

        var accounts = ReadAccounts(workbook);
        var categories = ReadCategories(workbook);
        var transactions = ReadTransactions(workbook);
        var transactionItems = ReadTransactionItems(workbook);

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new InvalidOperationException("User profile was not found.");
        }

        var skippedRows = 0;
        var updatedSettings = 0;
        var bulkConfig = new BulkConfig
        {
            BatchSize = 2_000,
            TrackingEntities = false,
            SetOutputIdentity = false,
        };

        await using var dbTransaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await dbContext.Transactions
            .ForUser(userId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(transaction => transaction.OriginalTransactionId, (Guid?)null)
                .SetProperty(transaction => transaction.RelatedTransactionId, (Guid?)null),
                cancellationToken);

        await dbContext.TransactionItems
            .Where(item => item.Transaction.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Transactions
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Categories
            .ForUser(userId)
            .Where(category => category.ParentId != null)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Categories
            .ForUser(userId)
            .Where(category => category.ParentId == null)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Accounts
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        var importedAccounts = accounts
            .Where(item => item.Id != Guid.Empty && !string.IsNullOrWhiteSpace(item.Name))
            .Select(item => new Account
            {
                Id = item.Id,
                UserId = userId,
                Name = item.Name.Trim(),
                Description = NullIfWhiteSpace(item.Description),
                Currency = SupportedCurrencies.NormalizeOrDefault(item.Currency, user.BaseCurrency),
                Color = string.IsNullOrWhiteSpace(item.Color) ? "#4C6EF5" : item.Color.Trim(),
                Icon = string.IsNullOrWhiteSpace(item.Icon) ? "IconWallet" : item.Icon.Trim(),
                Type = item.Type,
                CurrentBalance = item.CurrentBalance,
            })
            .ToList();

        var accountIds = importedAccounts.Select(item => item.Id).ToHashSet();

        var categoryMap = categories
            .Where(item => item.Id != Guid.Empty && !string.IsNullOrWhiteSpace(item.Name))
            .ToDictionary(item => item.Id, item => item);

        var importedCategories = new List<Category>();
        var insertedCategoryIds = new HashSet<Guid>();

        while (insertedCategoryIds.Count < categoryMap.Count)
        {
            var progress = false;

            foreach (var item in categoryMap.Values)
            {
                if (insertedCategoryIds.Contains(item.Id))
                {
                    continue;
                }

                if (item.ParentId.HasValue && !insertedCategoryIds.Contains(item.ParentId.Value))
                {
                    continue;
                }

                importedCategories.Add(new Category
                {
                    Id = item.Id,
                    UserId = userId,
                    Name = item.Name.Trim(),
                    Color = string.IsNullOrWhiteSpace(item.Color) ? "#000000" : item.Color.Trim(),
                    Icon = string.IsNullOrWhiteSpace(item.Icon) ? "IconTag" : item.Icon.Trim(),
                    ParentId = item.ParentId,
                    Type = item.Type,
                });

                insertedCategoryIds.Add(item.Id);
                progress = true;
            }

            if (!progress)
            {
                skippedRows += categoryMap.Count - insertedCategoryIds.Count;
                break;
            }
        }

        var categoryIds = importedCategories.Select(item => item.Id).ToHashSet();

        var relatedReferences = new List<(Transaction Transaction, Guid? RelatedId, Guid? OriginalId)>();
        var importedTransactions = new List<Transaction>();
        var importedTransactionItems = new List<TransactionItem>();

        foreach (var item in transactions)
        {
            if (item.Id == Guid.Empty || !accountIds.Contains(item.AccountId))
            {
                skippedRows++;
                continue;
            }

            if (item.TargetAccountId.HasValue && !accountIds.Contains(item.TargetAccountId.Value))
            {
                skippedRows++;
                continue;
            }

            if (item.CategoryId.HasValue && !categoryIds.Contains(item.CategoryId.Value))
            {
                skippedRows++;
                continue;
            }

            if (item.SubCategoryId.HasValue && !categoryIds.Contains(item.SubCategoryId.Value))
            {
                skippedRows++;
                continue;
            }

            var transaction = new Transaction
            {
                Id = item.Id,
                UserId = userId,
                Date = item.Date,
                Type = item.Type,
                Amount = item.Amount,
                Amount2 = item.Amount2,
                Currency = SupportedCurrencies.NormalizeOrNull(item.Currency),
                Currency2 = SupportedCurrencies.NormalizeOrNull(item.Currency2),
                AccountId = item.AccountId,
                CategoryId = item.CategoryId,
                SubCategoryId = item.SubCategoryId,
                TargetAccountId = item.TargetAccountId,
                RelatedTransactionId = null,
                OriginalTransactionId = null,
                IsRefund = item.IsRefund,
                Note = string.IsNullOrWhiteSpace(item.Note) ? null : item.Note.Trim(),
                MerchantName = string.IsNullOrWhiteSpace(item.MerchantName) ? null : item.MerchantName.Trim(),
                Location = string.IsNullOrWhiteSpace(item.Location) ? null : item.Location.Trim(),
            };

            importedTransactions.Add(transaction);
            relatedReferences.Add((transaction, item.RelatedTransactionId, item.OriginalTransactionId));
        }

        var importedTransactionIds = importedTransactions.Select(item => item.Id).ToHashSet();

        foreach (var (transaction, relatedId, originalId) in relatedReferences)
        {
            transaction.RelatedTransactionId = relatedId.HasValue && importedTransactionIds.Contains(relatedId.Value)
                ? relatedId
                : null;

            transaction.OriginalTransactionId = originalId.HasValue && importedTransactionIds.Contains(originalId.Value)
                ? originalId
                : null;
        }

        var transactionsWithItems = importedTransactionIds;

        foreach (var item in transactionItems)
        {
            if (!transactionsWithItems.Contains(item.TransactionId))
            {
                skippedRows++;
                continue;
            }

            if (item.CategoryId.HasValue && !categoryIds.Contains(item.CategoryId.Value))
            {
                skippedRows++;
                continue;
            }

            if (item.SubCategoryId.HasValue && !categoryIds.Contains(item.SubCategoryId.Value))
            {
                skippedRows++;
                continue;
            }

            importedTransactionItems.Add(new TransactionItem
            {
                Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id,
                TransactionId = item.TransactionId,
                Name = item.Name,
                Quantity = item.Quantity,
                Unit = string.IsNullOrWhiteSpace(item.Unit) ? null : item.Unit.Trim(),
                UnitPrice = item.UnitPrice,
                PromotionAmount = item.PromotionAmount,
                FinalAmount = item.FinalAmount,
                CategoryId = item.CategoryId,
                SubCategoryId = item.SubCategoryId,
            });
        }

        if (importedAccounts.Count > 0)
        {
            await dbContext.BulkInsertAsync(importedAccounts, bulkConfig, cancellationToken: cancellationToken);
        }

        if (importedCategories.Count > 0)
        {
            await dbContext.BulkInsertAsync(importedCategories, bulkConfig, cancellationToken: cancellationToken);
        }

        if (importedTransactions.Count > 0)
        {
            await dbContext.BulkInsertAsync(importedTransactions, bulkConfig, cancellationToken: cancellationToken);
        }

        if (importedTransactionItems.Count > 0)
        {
            await dbContext.BulkInsertAsync(importedTransactionItems, bulkConfig, cancellationToken: cancellationToken);
        }

        if (SupportedCurrencies.IsSupported(settings.BaseCurrency))
        {
            user.BaseCurrency = settings.BaseCurrency.Trim().ToUpperInvariant();
            updatedSettings = 1;
        }

        if (updatedSettings > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await dbTransaction.CommitAsync(cancellationToken);

        var importedSubCategories = importedCategories.Count(item => item.ParentId.HasValue);

        return new FlametteImportResult(
            importedTransactions.Count,
            importedAccounts.Count,
            importedCategories.Count,
            importedSubCategories,
            importedTransactionItems.Count,
            updatedSettings,
            importedAccounts.Count,
            skippedRows);
    }

    private static void WriteSettingsSheet(XLWorkbook workbook, string baseCurrency)
    {
        var sheet = workbook.Worksheets.Add(SettingsSheet);

        sheet.Cell(1, 1).Value = "Key";
        sheet.Cell(1, 2).Value = "Value";

        sheet.Cell(2, 1).Value = "Format";
        sheet.Cell(2, 2).Value = Format;

        sheet.Cell(3, 1).Value = "Version";
        sheet.Cell(3, 2).Value = CurrentVersion.ToString(CultureInfo.InvariantCulture);

        sheet.Cell(4, 1).Value = "ExportedAtUtc";
        sheet.Cell(4, 2).Value = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture);

        sheet.Cell(5, 1).Value = "BaseCurrency";
        sheet.Cell(5, 2).Value = baseCurrency;

        sheet.Columns().AdjustToContents();
    }

    private static void WriteAccountsSheet(XLWorkbook workbook, IReadOnlyList<Account> accounts)
    {
        var sheet = workbook.Worksheets.Add(AccountsSheet);
        WriteHeaderRow(sheet, "Id", "Name", "Description", "Currency", "Color", "Icon", "Type", "CurrentBalance");

        var row = 2;
        foreach (var item in accounts)
        {
            sheet.Cell(row, 1).Value = item.Id.ToString();
            sheet.Cell(row, 2).Value = item.Name;
            sheet.Cell(row, 3).Value = item.Description ?? string.Empty;
            sheet.Cell(row, 4).Value = item.Currency;
            sheet.Cell(row, 5).Value = item.Color;
            sheet.Cell(row, 6).Value = item.Icon;
            sheet.Cell(row, 7).Value = item.Type.ToString();
            sheet.Cell(row, 8).Value = item.CurrentBalance.ToString(CultureInfo.InvariantCulture);
            row++;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void WriteCategoriesSheet(XLWorkbook workbook, IReadOnlyList<Category> categories)
    {
        var sheet = workbook.Worksheets.Add(CategoriesSheet);
        WriteHeaderRow(sheet, "Id", "Name", "Color", "Icon", "ParentId", "Type");

        var row = 2;
        foreach (var item in categories)
        {
            sheet.Cell(row, 1).Value = item.Id.ToString();
            sheet.Cell(row, 2).Value = item.Name;
            sheet.Cell(row, 3).Value = item.Color;
            sheet.Cell(row, 4).Value = item.Icon;
            sheet.Cell(row, 5).Value = item.ParentId?.ToString() ?? string.Empty;
            sheet.Cell(row, 6).Value = item.Type.ToString();
            row++;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void WriteTransactionsSheet(XLWorkbook workbook, IReadOnlyList<Transaction> transactions)
    {
        var sheet = workbook.Worksheets.Add(TransactionsSheet);
        WriteHeaderRow(
            sheet,
            "Id",
            "Date",
            "Type",
            "Amount",
            "Amount2",
            "Currency",
            "Currency2",
            "AccountId",
            "CategoryId",
            "SubCategoryId",
            "TargetAccountId",
            "RelatedTransactionId",
            "OriginalTransactionId",
            "IsRefund",
            "Note",
            "MerchantName",
            "Location");

        var row = 2;
        foreach (var item in transactions)
        {
            sheet.Cell(row, 1).Value = item.Id.ToString();
            sheet.Cell(row, 2).Value = item.Date.ToString("O", CultureInfo.InvariantCulture);
            sheet.Cell(row, 3).Value = item.Type.ToString();
            sheet.Cell(row, 4).Value = item.Amount.ToString(CultureInfo.InvariantCulture);
            sheet.Cell(row, 5).Value = item.Amount2?.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
            sheet.Cell(row, 6).Value = item.Currency ?? string.Empty;
            sheet.Cell(row, 7).Value = item.Currency2 ?? string.Empty;
            sheet.Cell(row, 8).Value = item.AccountId.ToString();
            sheet.Cell(row, 9).Value = item.CategoryId?.ToString() ?? string.Empty;
            sheet.Cell(row, 10).Value = item.SubCategoryId?.ToString() ?? string.Empty;
            sheet.Cell(row, 11).Value = item.TargetAccountId?.ToString() ?? string.Empty;
            sheet.Cell(row, 12).Value = item.RelatedTransactionId?.ToString() ?? string.Empty;
            sheet.Cell(row, 13).Value = item.OriginalTransactionId?.ToString() ?? string.Empty;
            sheet.Cell(row, 14).Value = item.IsRefund.ToString();
            sheet.Cell(row, 15).Value = item.Note ?? string.Empty;
            sheet.Cell(row, 16).Value = item.MerchantName ?? string.Empty;
            sheet.Cell(row, 17).Value = item.Location ?? string.Empty;
            row++;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void WriteTransactionItemsSheet(XLWorkbook workbook, IReadOnlyList<TransactionItem> items)
    {
        var sheet = workbook.Worksheets.Add(TransactionItemsSheet);
        WriteHeaderRow(
            sheet,
            "Id",
            "TransactionId",
            "Name",
            "Quantity",
            "Unit",
            "UnitPrice",
            "PromotionAmount",
            "FinalAmount",
            "CategoryId",
            "SubCategoryId");

        var row = 2;
        foreach (var item in items.OrderBy(x => x.TransactionId).ThenBy(x => x.Id))
        {
            sheet.Cell(row, 1).Value = item.Id.ToString();
            sheet.Cell(row, 2).Value = item.TransactionId.ToString();
            sheet.Cell(row, 3).Value = item.Name;
            sheet.Cell(row, 4).Value = item.Quantity.ToString(CultureInfo.InvariantCulture);
            sheet.Cell(row, 5).Value = item.Unit ?? string.Empty;
            sheet.Cell(row, 6).Value = item.UnitPrice.ToString(CultureInfo.InvariantCulture);
            sheet.Cell(row, 7).Value = item.PromotionAmount.ToString(CultureInfo.InvariantCulture);
            sheet.Cell(row, 8).Value = item.FinalAmount.ToString(CultureInfo.InvariantCulture);
            sheet.Cell(row, 9).Value = item.CategoryId?.ToString() ?? string.Empty;
            sheet.Cell(row, 10).Value = item.SubCategoryId?.ToString() ?? string.Empty;
            row++;
        }

        sheet.Columns().AdjustToContents();
    }

    private static SettingsRow ReadSettings(XLWorkbook workbook)
    {
        var sheet = RequireSheet(workbook, SettingsSheet);
        var settings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var row = 2; row <= lastRow; row++)
        {
            var key = GetCellText(sheet.Cell(row, 1));
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            settings[key.Trim()] = GetCellText(sheet.Cell(row, 2));
        }

        var format = GetRequiredSetting(settings, "Format");
        var version = ParseInt(GetRequiredSetting(settings, "Version"), "Settings.Version");
        var baseCurrency = GetRequiredSetting(settings, "BaseCurrency");

        return new SettingsRow(format, version, baseCurrency);
    }

    private static List<AccountRow> ReadAccounts(XLWorkbook workbook)
    {
        var sheet = RequireSheet(workbook, AccountsSheet);
        var rows = new List<AccountRow>();
        var hasDescriptionColumn = (sheet.LastColumnUsed()?.ColumnNumber() ?? 0) >= 8;

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var row = 2; row <= lastRow; row++)
        {
            if (IsRowEmpty(sheet, row, hasDescriptionColumn ? 8 : 7))
            {
                continue;
            }

            rows.Add(new AccountRow(
                ParseGuid(GetCellText(sheet.Cell(row, 1)), $"Accounts[{row}].Id"),
                GetCellText(sheet.Cell(row, 2)),
                hasDescriptionColumn ? NullIfWhiteSpace(GetCellText(sheet.Cell(row, 3))) : null,
                GetCellText(sheet.Cell(row, hasDescriptionColumn ? 4 : 3)),
                GetCellText(sheet.Cell(row, hasDescriptionColumn ? 5 : 4)),
                GetCellText(sheet.Cell(row, hasDescriptionColumn ? 6 : 5)),
                ParseEnum<AccountType>(GetCellText(sheet.Cell(row, hasDescriptionColumn ? 7 : 6)), $"Accounts[{row}].Type"),
                ParseDecimal(GetCellText(sheet.Cell(row, hasDescriptionColumn ? 8 : 7)), $"Accounts[{row}].CurrentBalance")));
        }

        return rows;
    }

    private static List<CategoryRow> ReadCategories(XLWorkbook workbook)
    {
        var sheet = RequireSheet(workbook, CategoriesSheet);
        var rows = new List<CategoryRow>();

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var row = 2; row <= lastRow; row++)
        {
            if (IsRowEmpty(sheet, row, 6))
            {
                continue;
            }

            rows.Add(new CategoryRow(
                ParseGuid(GetCellText(sheet.Cell(row, 1)), $"Categories[{row}].Id"),
                GetCellText(sheet.Cell(row, 2)),
                GetCellText(sheet.Cell(row, 3)),
                GetCellText(sheet.Cell(row, 4)),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 5)), $"Categories[{row}].ParentId"),
                ParseEnum<CategoryType>(GetCellText(sheet.Cell(row, 6)), $"Categories[{row}].Type")));
        }

        return rows;
    }

    private static List<TransactionRow> ReadTransactions(XLWorkbook workbook)
    {
        var sheet = RequireSheet(workbook, TransactionsSheet);
        var rows = new List<TransactionRow>();

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var row = 2; row <= lastRow; row++)
        {
            if (IsRowEmpty(sheet, row, 17))
            {
                continue;
            }

            rows.Add(new TransactionRow(
                ParseGuid(GetCellText(sheet.Cell(row, 1)), $"Transactions[{row}].Id"),
                ParseDateTime(GetCellText(sheet.Cell(row, 2)), $"Transactions[{row}].Date"),
                ParseEnum<TransactionType>(GetCellText(sheet.Cell(row, 3)), $"Transactions[{row}].Type"),
                ParseDecimal(GetCellText(sheet.Cell(row, 4)), $"Transactions[{row}].Amount"),
                ParseOptionalDecimal(GetCellText(sheet.Cell(row, 5)), $"Transactions[{row}].Amount2"),
                GetNullableText(sheet.Cell(row, 6)),
                GetNullableText(sheet.Cell(row, 7)),
                ParseGuid(GetCellText(sheet.Cell(row, 8)), $"Transactions[{row}].AccountId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 9)), $"Transactions[{row}].CategoryId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 10)), $"Transactions[{row}].SubCategoryId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 11)), $"Transactions[{row}].TargetAccountId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 12)), $"Transactions[{row}].RelatedTransactionId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 13)), $"Transactions[{row}].OriginalTransactionId"),
                ParseBool(GetCellText(sheet.Cell(row, 14)), $"Transactions[{row}].IsRefund"),
                GetNullableText(sheet.Cell(row, 15)),
                GetNullableText(sheet.Cell(row, 16)),
                GetNullableText(sheet.Cell(row, 17))));
        }

        return rows;
    }

    private static List<TransactionItemRow> ReadTransactionItems(XLWorkbook workbook)
    {
        var sheet = RequireSheet(workbook, TransactionItemsSheet);
        var rows = new List<TransactionItemRow>();

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var row = 2; row <= lastRow; row++)
        {
            if (IsRowEmpty(sheet, row, 10))
            {
                continue;
            }

            rows.Add(new TransactionItemRow(
                ParseGuid(GetCellText(sheet.Cell(row, 1)), $"TransactionItems[{row}].Id"),
                ParseGuid(GetCellText(sheet.Cell(row, 2)), $"TransactionItems[{row}].TransactionId"),
                GetCellText(sheet.Cell(row, 3)),
                ParseDecimal(GetCellText(sheet.Cell(row, 4)), $"TransactionItems[{row}].Quantity"),
                GetNullableText(sheet.Cell(row, 5)),
                ParseDecimal(GetCellText(sheet.Cell(row, 6)), $"TransactionItems[{row}].UnitPrice"),
                ParseDecimal(GetCellText(sheet.Cell(row, 7)), $"TransactionItems[{row}].PromotionAmount"),
                ParseDecimal(GetCellText(sheet.Cell(row, 8)), $"TransactionItems[{row}].FinalAmount"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 9)), $"TransactionItems[{row}].CategoryId"),
                ParseOptionalGuid(GetCellText(sheet.Cell(row, 10)), $"TransactionItems[{row}].SubCategoryId")));
        }

        return rows;
    }

    private static void ValidateSettings(SettingsRow settings)
    {
        if (!string.Equals(settings.Format?.Trim(), Format, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Unsupported backup format. Expected '{Format}'.");
        }

        if (settings.Version != CurrentVersion)
        {
            throw new InvalidOperationException($"Unsupported backup version '{settings.Version}'.");
        }
    }

    private static void WriteHeaderRow(IXLWorksheet sheet, params string[] headers)
    {
        for (var index = 0; index < headers.Length; index++)
        {
            sheet.Cell(1, index + 1).Value = headers[index];
        }
    }

    private static IXLWorksheet RequireSheet(XLWorkbook workbook, string sheetName)
    {
        if (!workbook.TryGetWorksheet(sheetName, out var sheet))
        {
            throw new InvalidOperationException($"Worksheet '{sheetName}' is missing in backup file.");
        }

        return sheet;
    }

    private static string GetRequiredSetting(IReadOnlyDictionary<string, string> settings, string key)
    {
        if (!settings.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Settings.{key} is required.");
        }

        return value.Trim();
    }

    private static string GetCellText(IXLCell cell)
    {
        return cell.GetValue<string>().Trim();
    }

    private static string? GetNullableText(IXLCell cell)
    {
        var value = GetCellText(cell);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static bool IsRowEmpty(IXLWorksheet sheet, int row, int columnCount)
    {
        for (var column = 1; column <= columnCount; column++)
        {
            if (!string.IsNullOrWhiteSpace(GetCellText(sheet.Cell(row, column))))
            {
                return false;
            }
        }

        return true;
    }

    private static int ParseInt(string value, string field)
    {
        if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid integer value '{value}'.");
    }

    private static bool ParseBool(string value, string field)
    {
        if (bool.TryParse(value, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid bool value '{value}'.");
    }

    private static DateTime ParseDateTime(string value, string field)
    {
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid date value '{value}'.");
    }

    private static decimal ParseDecimal(string value, string field)
    {
        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid decimal value '{value}'.");
    }

    private static decimal? ParseOptionalDecimal(string value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return ParseDecimal(value, field);
    }

    private static Guid ParseGuid(string value, string field)
    {
        if (Guid.TryParse(value, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid guid value '{value}'.");
    }

    private static Guid? ParseOptionalGuid(string value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return ParseGuid(value, field);
    }

    private static TEnum ParseEnum<TEnum>(string value, string field)
        where TEnum : struct, Enum
    {
        if (Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{field} has invalid enum value '{value}'.");
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private sealed record SettingsRow(string Format, int Version, string BaseCurrency);

    private sealed record AccountRow(
        Guid Id,
        string Name,
        string? Description,
        string Currency,
        string Color,
        string Icon,
        AccountType Type,
        decimal CurrentBalance);

    private sealed record CategoryRow(
        Guid Id,
        string Name,
        string Color,
        string Icon,
        Guid? ParentId,
        CategoryType Type);

    private sealed record TransactionRow(
        Guid Id,
        DateTime Date,
        TransactionType Type,
        decimal Amount,
        decimal? Amount2,
        string? Currency,
        string? Currency2,
        Guid AccountId,
        Guid? CategoryId,
        Guid? SubCategoryId,
        Guid? TargetAccountId,
        Guid? RelatedTransactionId,
        Guid? OriginalTransactionId,
        bool IsRefund,
        string? Note,
        string? MerchantName,
        string? Location);

    private sealed record TransactionItemRow(
        Guid Id,
        Guid TransactionId,
        string Name,
        decimal Quantity,
        string? Unit,
        decimal UnitPrice,
        decimal PromotionAmount,
        decimal FinalAmount,
        Guid? CategoryId,
        Guid? SubCategoryId);
}
