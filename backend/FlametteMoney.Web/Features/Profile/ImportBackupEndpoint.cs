using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace FlametteMoney.Web.Features.Profile;

public record ImportBackupResponse(
    string Type,
    int ImportedTransactions,
    int ImportedAccounts,
    int ImportedCategories,
    int ImportedSubCategories,
    int UpdatedBalanceSnapshots,
    int SkippedRows);

public sealed class ImportBackupEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/profile/import-backup", Handle)
            .WithTags("Profile")
            .WithSummary("Import data backup")
            .WithDescription("Import profile data from external backup formats such as 1Money CSV.")
            .DisableAntiforgery()
            .Produces<ImportBackupResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);
    }

    private static async Task<Results<Ok<ImportBackupResponse>, BadRequest<string>>> Handle(
        IFormFile file,
        [FromForm] string type,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return TypedResults.BadRequest("Backup file is required.");
        }

        if (!IsOneMoneyType(type))
        {
            return TypedResults.BadRequest("Unsupported backup type. Use 'one-money'.");
        }

        var userId = currentUserContext.GetScopedUserId();

        OneMoneyParseResult parsed;
        await using (var stream = file.OpenReadStream())
        {
            parsed = await ParseOneMoneyCsvAsync(stream, cancellationToken);
        }

        if (parsed.Transactions.Count == 0)
        {
            return TypedResults.BadRequest("No transaction rows were found in the CSV.");
        }

        await using var importTransaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await dbContext.Transactions
            .ForUser(userId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(transaction => transaction.OriginalTransactionId, (Guid?)null)
                .SetProperty(transaction => transaction.RelatedTransactionId, (Guid?)null),
                cancellationToken);

        await dbContext.Transactions
            .ForUser(userId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Trips
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

        var accountsByName = new Dictionary<string, Account>(StringComparer.OrdinalIgnoreCase);
        var categoriesByKey = new Dictionary<string, Category>(StringComparer.OrdinalIgnoreCase);

        var accountCurrencyByName = BuildAccountCurrencyHints(parsed);
        var createdAccounts = 0;
        foreach (var accountName in CollectAllAccountNames(parsed))
        {
            var key = NormalizeKey(accountName);
            if (accountsByName.ContainsKey(key))
            {
                continue;
            }

            var inferredCurrency = accountCurrencyByName.TryGetValue(key, out var hintedCurrency)
                ? hintedCurrency
                : "PLN";

            var account = new Account
            {
                Id = Guid.NewGuid(),
                Name = accountName.Trim(),
                Currency = NormalizeCurrencyCode(inferredCurrency) ?? "PLN",
                Color = PickAccountColor(accountName),
                Type = InferAccountType(accountName),
                Icon = InferAccountIcon(accountName),
                InitialBalance = 0m,
                CurrentBalance = 0m
            };

            dbContext.Accounts.Add(account);
            accountsByName[key] = account;
            createdAccounts++;
        }

        var createdCategories = 0;
        var createdSubCategories = 0;

        foreach (var row in parsed.Transactions)
        {
            if (row.Type is not OneMoneyTransactionType.Income and not OneMoneyTransactionType.Expense)
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.Target))
            {
                continue;
            }

            var categoryType = row.Type == OneMoneyTransactionType.Income
                ? CategoryType.Income
                : CategoryType.Expense;

            var (parentName, childName) = ParseCategoryParts(row.Target);

            var parent = EnsureCategory(parentName, categoryType, null, categoriesByKey, dbContext, ref createdCategories);

            if (!string.IsNullOrWhiteSpace(childName))
            {
                EnsureCategory(childName!, categoryType, parent.Id, categoriesByKey, dbContext, ref createdSubCategories);
            }
        }

        var importedTransactions = 0;
        var skippedRows = 0;

        foreach (var row in parsed.Transactions.OrderBy(t => t.Date))
        {
            var fromAccountKey = NormalizeKey(row.FromAccount);
            if (!accountsByName.TryGetValue(fromAccountKey, out var sourceAccount))
            {
                skippedRows++;
                continue;
            }

            if (row.Amount <= 0)
            {
                skippedRows++;
                continue;
            }

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                Date = row.Date,
                Amount = row.Amount,
                Amount2 = row.Type == OneMoneyTransactionType.Transfer
                    ? (row.Amount2 > 0 ? row.Amount2 : row.Amount)
                    : (row.Amount2 > 0 ? row.Amount2 : null),
                Currency = NormalizeCurrencyCode(row.Currency) ?? sourceAccount.Currency,
                Currency2 = row.Type == OneMoneyTransactionType.Transfer
                    ? NormalizeCurrencyCode(row.Currency2)
                    : NormalizeCurrencyCode(row.Currency2),
                AccountId = sourceAccount.Id,
                Note = BuildNote(row.Tags, row.Notes)
            };

            switch (row.Type)
            {
                case OneMoneyTransactionType.Expense:
                {
                    transaction.Type = TransactionType.Expense;
                    if (!TryResolveCategory(row.Target, CategoryType.Expense, categoriesByKey, out var categoryId, out var subCategoryId))
                    {
                        skippedRows++;
                        continue;
                    }

                    transaction.CategoryId = categoryId;
                    transaction.SubCategoryId = subCategoryId;

                    sourceAccount.CurrentBalance -= row.Amount;
                    break;
                }
                case OneMoneyTransactionType.Income:
                {
                    transaction.Type = TransactionType.Income;
                    if (!TryResolveCategory(row.Target, CategoryType.Income, categoriesByKey, out var categoryId, out var subCategoryId))
                    {
                        skippedRows++;
                        continue;
                    }

                    transaction.CategoryId = categoryId;
                    transaction.SubCategoryId = subCategoryId;

                    sourceAccount.CurrentBalance += row.Amount;
                    break;
                }
                case OneMoneyTransactionType.Transfer:
                {
                    transaction.Type = TransactionType.Transfer;
                    var targetAccountKey = NormalizeKey(row.Target);
                    if (!accountsByName.TryGetValue(targetAccountKey, out var targetAccount))
                    {
                        skippedRows++;
                        continue;
                    }

                    transaction.TargetAccountId = targetAccount.Id;
                    transaction.Amount2 = row.Amount2 > 0 ? row.Amount2 : row.Amount;
                    transaction.Currency2 ??= targetAccount.Currency;

                    sourceAccount.CurrentBalance -= row.Amount;
                    targetAccount.CurrentBalance += transaction.Amount2 ?? row.Amount;
                    break;
                }
                default:
                    skippedRows++;
                    continue;
            }

            dbContext.Transactions.Add(transaction);
            importedTransactions++;
        }

        var updatedBalanceSnapshots = 0;
        foreach (var balance in parsed.Balances)
        {
            if (!accountsByName.TryGetValue(NormalizeKey(balance.Name), out var account))
            {
                continue;
            }

            var targetBalance = balance.Balance;
            var delta = targetBalance - account.CurrentBalance;
            account.InitialBalance += delta;
            account.CurrentBalance = targetBalance;

            var balanceCurrency = NormalizeCurrencyCode(balance.Currency);
            if (!string.IsNullOrWhiteSpace(balanceCurrency))
            {
                account.Currency = balanceCurrency;
            }

            updatedBalanceSnapshots++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await importTransaction.CommitAsync(cancellationToken);

        return TypedResults.Ok(new ImportBackupResponse(
            "one-money",
            importedTransactions,
            createdAccounts,
            createdCategories,
            createdSubCategories,
            updatedBalanceSnapshots,
            skippedRows + parsed.SkippedRows));
    }

    private static bool IsOneMoneyType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
        {
            return false;
        }

        var normalized = type.Trim().ToLowerInvariant();
        return normalized is "one-money" or "onemoney" or "1money";
    }

    private static HashSet<string> CollectAllAccountNames(OneMoneyParseResult parsed)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in parsed.Transactions)
        {
            if (!string.IsNullOrWhiteSpace(row.FromAccount))
            {
                set.Add(row.FromAccount.Trim());
            }

            if (row.Type == OneMoneyTransactionType.Transfer && !string.IsNullOrWhiteSpace(row.Target))
            {
                set.Add(row.Target.Trim());
            }
        }

        foreach (var balance in parsed.Balances)
        {
            if (!string.IsNullOrWhiteSpace(balance.Name))
            {
                set.Add(balance.Name.Trim());
            }
        }

        return set;
    }

    private static Dictionary<string, string> BuildAccountCurrencyHints(OneMoneyParseResult parsed)
    {
        var hints = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var balance in parsed.Balances)
        {
            var key = NormalizeKey(balance.Name);
            var currency = NormalizeCurrencyCode(balance.Currency);
            if (!string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(currency))
            {
                hints[key] = currency;
            }
        }

        foreach (var row in parsed.Transactions)
        {
            var fromKey = NormalizeKey(row.FromAccount);
            var fromCurrency = NormalizeCurrencyCode(row.Currency);
            if (!string.IsNullOrWhiteSpace(fromKey) && !string.IsNullOrWhiteSpace(fromCurrency) && !hints.ContainsKey(fromKey))
            {
                hints[fromKey] = fromCurrency;
            }

            if (row.Type == OneMoneyTransactionType.Transfer)
            {
                var targetKey = NormalizeKey(row.Target);
                var targetCurrency = NormalizeCurrencyCode(row.Currency2);
                if (!string.IsNullOrWhiteSpace(targetKey) && !string.IsNullOrWhiteSpace(targetCurrency) && !hints.ContainsKey(targetKey))
                {
                    hints[targetKey] = targetCurrency;
                }
            }
        }

        return hints;
    }

    private static Category EnsureCategory(
        string name,
        CategoryType type,
        Guid? parentId,
        Dictionary<string, Category> categoriesByKey,
        AppDbContext dbContext,
        ref int createdCount)
    {
        var key = BuildCategoryKey(name, type, parentId);
        if (categoriesByKey.TryGetValue(key, out var existing))
        {
            return existing;
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Type = type,
            ParentId = parentId,
            Color = GenerateRandomCategoryColor(),
            Icon = parentId is null
                ? (type == CategoryType.Income ? "income" : "expense")
                : "tag"
        };

        dbContext.Categories.Add(category);
        categoriesByKey[key] = category;
        createdCount++;

        return category;
    }

    private static bool TryResolveCategory(
        string rawCategory,
        CategoryType type,
        Dictionary<string, Category> categoriesByKey,
        out Guid categoryId,
        out Guid? subCategoryId)
    {
        var (parentName, childName) = ParseCategoryParts(rawCategory);
        var parentKey = BuildCategoryKey(parentName, type, null);

        if (!categoriesByKey.TryGetValue(parentKey, out var parent))
        {
            categoryId = Guid.Empty;
            subCategoryId = null;
            return false;
        }

        categoryId = parent.Id;
        subCategoryId = null;

        if (string.IsNullOrWhiteSpace(childName))
        {
            return true;
        }

        var subKey = BuildCategoryKey(childName!, type, parent.Id);
        if (!categoriesByKey.TryGetValue(subKey, out var child))
        {
            return true;
        }

        subCategoryId = child.Id;
        return true;
    }

    private static (string ParentName, string? ChildName) ParseCategoryParts(string rawValue)
    {
        var value = rawValue?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            return ("Other", null);
        }

        var open = value.LastIndexOf('(');
        var close = value.EndsWith(")", StringComparison.Ordinal) ? value.Length - 1 : -1;

        if (open > 0 && close > open)
        {
            var parent = value[..open].Trim();
            var child = value.Substring(open + 1, close - open - 1).Trim();
            if (!string.IsNullOrWhiteSpace(parent) && !string.IsNullOrWhiteSpace(child))
            {
                return (parent, child);
            }
        }

        return (value, null);
    }

    private static string? BuildNote(string? tags, string? notes)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(tags))
        {
            parts.Add($"Tags: {tags.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(notes))
        {
            parts.Add(notes.Trim());
        }

        return parts.Count == 0 ? null : string.Join(" | ", parts);
    }

    private static string NormalizeKey(string? input)
    {
        return (input ?? string.Empty).Trim();
    }

    private static string CreateCategoryKey(Category category)
    {
        return BuildCategoryKey(category.Name, category.Type, category.ParentId);
    }

    private static string BuildCategoryKey(string name, CategoryType type, Guid? parentId)
    {
        return $"{NormalizeKey(name)}|{type}|{parentId?.ToString() ?? "ROOT"}";
    }

    private static string? NormalizeCurrencyCode(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return null;
        }

        var normalized = currency.Trim().ToUpperInvariant();
        return normalized.Length >= 3 ? normalized[..3] : normalized;
    }

    private static string PickAccountColor(string accountName)
    {
        var palette = new[]
        {
            "#4C6EF5",
            "#339AF0",
            "#22B8CF",
            "#20C997",
            "#51CF66",
            "#FCC419",
            "#FF922B",
            "#FF6B6B",
            "#CC5DE8"
        };

        var hash = Math.Abs(accountName.Trim().ToUpperInvariant().GetHashCode());
        return palette[hash % palette.Length];
    }

    private static string GenerateRandomCategoryColor()
    {
        var red = Random.Shared.Next(48, 208);
        var green = Random.Shared.Next(48, 208);
        var blue = Random.Shared.Next(48, 208);

        return $"#{red:X2}{green:X2}{blue:X2}";
    }

    private static AccountType InferAccountType(string accountName)
    {
        var value = accountName.Trim().ToLowerInvariant();

        if (value.Contains("cash"))
        {
            return AccountType.Cash;
        }

        if (value.Contains("deposit") || value.Contains("savings"))
        {
            return AccountType.Savings;
        }

        return AccountType.DebitCard;
    }

    private static string InferAccountIcon(string accountName)
    {
        if (string.IsNullOrWhiteSpace(accountName))
        {
            return "IconWallet";
        }

        var normalized = accountName.Trim().ToLowerInvariant();
        if (normalized.Contains("cash") || normalized.Contains("wallet"))
        {
            return "IconCash";
        }

        if (normalized.Contains("credit"))
        {
            return "IconCreditCard";
        }

        if (normalized.Contains("saving") || normalized.Contains("deposit"))
        {
            return "IconPigMoney";
        }

        if (normalized.Contains("bank"))
        {
            return "IconBuildingBank";
        }

        return "IconWallet";
    }

    private static async Task<OneMoneyParseResult> ParseOneMoneyCsvAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);

        var result = new OneMoneyParseResult();
        CsvSection section = CsvSection.None;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var rawLine = await reader.ReadLineAsync(cancellationToken);
            if (rawLine is null)
            {
                break;
            }

            if (string.IsNullOrWhiteSpace(rawLine))
            {
                continue;
            }

            var cells = ParseCsvLine(rawLine);
            if (cells.Count == 0 || cells.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            if (MatchesHeader(cells, "DATE", "TYPE"))
            {
                section = CsvSection.Transactions;
                continue;
            }

            if (MatchesHeader(cells, "NAME", "BALANCE"))
            {
                section = CsvSection.Balances;
                continue;
            }

            if (section == CsvSection.Transactions)
            {
                if (!TryParseTransactionRow(cells, out var transactionRow))
                {
                    result.SkippedRows++;
                    continue;
                }

                result.Transactions.Add(transactionRow!);
                continue;
            }

            if (section == CsvSection.Balances)
            {
                if (!TryParseBalanceRow(cells, out var balanceRow))
                {
                    result.SkippedRows++;
                    continue;
                }

                result.Balances.Add(balanceRow!);
            }
        }

        return result;
    }

    private static bool MatchesHeader(IReadOnlyList<string> cells, string first, string second)
    {
        if (cells.Count < 2)
        {
            return false;
        }

        return string.Equals(cells[0].Trim(), first, StringComparison.OrdinalIgnoreCase)
            && string.Equals(cells[1].Trim(), second, StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryParseTransactionRow(IReadOnlyList<string> cells, out OneMoneyTransactionRow? row)
    {
        row = null;
        if (cells.Count < 10)
        {
            return false;
        }

        if (!TryParseDate(cells[0], out var date))
        {
            return false;
        }

        if (!TryParseType(cells[1], out var type))
        {
            return false;
        }

        if (!TryParseDecimal(cells[4], out var amount))
        {
            return false;
        }

        var amount2 = TryParseDecimal(cells[6], out var parsedAmount2) ? parsedAmount2 : 0m;

        row = new OneMoneyTransactionRow(
            date,
            type,
            cells[2].Trim(),
            cells[3].Trim(),
            amount,
            cells[5].Trim(),
            amount2,
            cells[7].Trim(),
            cells[8].Trim(),
            cells[9].Trim());

        return true;
    }

    private static bool TryParseBalanceRow(IReadOnlyList<string> cells, out OneMoneyBalanceRow? row)
    {
        row = null;
        if (cells.Count < 3)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(cells[0]))
        {
            return false;
        }

        if (!TryParseDecimal(cells[1], out var balance))
        {
            return false;
        }

        row = new OneMoneyBalanceRow(cells[0].Trim(), balance, cells[2].Trim());
        return true;
    }

    private static bool TryParseDate(string raw, out DateTime date)
    {
        return DateTime.TryParseExact(
            raw.Trim(),
            ["M/d/yy", "M/d/yyyy"],
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeLocal,
            out date);
    }

    private static bool TryParseDecimal(string raw, out decimal value)
    {
        return decimal.TryParse(raw.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static bool TryParseType(string raw, out OneMoneyTransactionType type)
    {
        var value = raw.Trim();
        if (value.Equals("Expense", StringComparison.OrdinalIgnoreCase))
        {
            type = OneMoneyTransactionType.Expense;
            return true;
        }

        if (value.Equals("Income", StringComparison.OrdinalIgnoreCase))
        {
            type = OneMoneyTransactionType.Income;
            return true;
        }

        if (value.Equals("Transfer", StringComparison.OrdinalIgnoreCase))
        {
            type = OneMoneyTransactionType.Transfer;
            return true;
        }

        type = default;
        return false;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var cells = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];

            if (ch == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }

                continue;
            }

            if (ch == ',' && !inQuotes)
            {
                cells.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(ch);
        }

        cells.Add(current.ToString());
        return cells;
    }

    private enum CsvSection
    {
        None,
        Transactions,
        Balances
    }

    private enum OneMoneyTransactionType
    {
        Income,
        Expense,
        Transfer
    }

    private sealed record OneMoneyTransactionRow(
        DateTime Date,
        OneMoneyTransactionType Type,
        string FromAccount,
        string Target,
        decimal Amount,
        string Currency,
        decimal Amount2,
        string Currency2,
        string Tags,
        string Notes);

    private sealed record OneMoneyBalanceRow(string Name, decimal Balance, string Currency);

    private sealed class OneMoneyParseResult
    {
        public List<OneMoneyTransactionRow> Transactions { get; } = [];
        public List<OneMoneyBalanceRow> Balances { get; } = [];
        public int SkippedRows { get; set; }
    }
}
