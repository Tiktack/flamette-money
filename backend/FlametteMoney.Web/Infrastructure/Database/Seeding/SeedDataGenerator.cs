using FlametteMoney.Web.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;

namespace FlametteMoney.Web.Infrastructure.Database.Seeding;

public sealed record SeedOptions(int Years, int? Seed);

public sealed record SeedResult(
    int AccountsAdded,
    int TransactionsAdded,
    int TransfersAdded,
    int RefundsAdded,
    DateTime StartDate,
    DateTime EndDate);

public sealed class SeedDataGenerator
{
    /// <summary>Generate demo accounts and transactions with realistic randomness.</summary>
    public async Task<SeedResult> SeedDemoAsync(
        AppDbContext dbContext,
        SeedOptions options,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        var years = Math.Clamp(options.Years, 2, 3);
        var startDate = DateTime.UtcNow.Date.AddYears(-years);
        var endDate = DateTime.UtcNow.Date;

        var random = options.Seed is null
            ? new Random()
            : new Random(options.Seed.Value);

        var categories = await dbContext.Categories
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var expenseCategories = categories
            .Where(category => category.Type == CategoryType.Expense)
            .ToList();

        var travelParentIds = expenseCategories
            .Where(category => category.ParentId is null && category.Name.Equals("Travel", StringComparison.OrdinalIgnoreCase))
            .Select(category => category.Id)
            .ToHashSet();

        if (travelParentIds.Count > 0)
        {
            expenseCategories = expenseCategories
                .Where(category =>
                    !travelParentIds.Contains(category.Id) &&
                    (category.ParentId is null || !travelParentIds.Contains(category.ParentId.Value)))
                .ToList();
        }

        var expenseParents = expenseCategories
            .Where(category => category.ParentId is null)
            .ToList();

        var expenseChildrenByParent = expenseCategories
            .Where(category => category.ParentId is not null)
            .GroupBy(category => category.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToList());

        var incomeCategories = categories
            .Where(category => category.Type == CategoryType.Income)
            .ToList();

        var accounts = await dbContext.Accounts
            .ToListAsync(cancellationToken);

        var accountsAdded = 0;
        var accountLookup = accounts.ToDictionary(account => account.Name, StringComparer.OrdinalIgnoreCase);
        var allAccounts = new List<Account>(accounts);

        foreach (var definition in GetAccountDefinitions())
        {
            if (accountLookup.TryGetValue(definition.Name, out var existingAccount))
            {
                allAccounts.Add(existingAccount);
                continue;
            }

            var account = new Account
            {
                Id = Guid.NewGuid(),
                Name = definition.Name,
                Currency = definition.Currency,
                Color = definition.Color,
                Type = definition.Type,
                InitialBalance = definition.InitialBalance,
                CurrentBalance = definition.InitialBalance
            };

            dbContext.Accounts.Add(account);
            allAccounts.Add(account);
            accountsAdded++;
        }

        if (allAccounts.Count == 0 || (expenseParents.Count == 0 && incomeCategories.Count == 0))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return new SeedResult(accountsAdded, 0, 0, 0, startDate, endDate);
        }

        var existingTrips = await dbContext.Trips
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var generatedTrips = BuildTripDefinitions(startDate, endDate, random);
        var allTripWindows = existingTrips
            .Where(trip => trip.StartDate is not null)
            .Select(trip => new TripWindow(
                trip.Id,
                trip.StartDate!.Value.Date,
                (trip.EndDate ?? trip.StartDate)!.Value.Date))
            .ToList();

        foreach (var generatedTrip in generatedTrips)
        {
            var alreadyExists = existingTrips.Any(existing =>
                existing.Name.Equals(generatedTrip.Name, StringComparison.OrdinalIgnoreCase) &&
                existing.StartDate?.Date == generatedTrip.StartDate.Date &&
                existing.EndDate?.Date == generatedTrip.EndDate.Date);

            if (alreadyExists)
            {
                continue;
            }

            var trip = new Trip
            {
                Id = Guid.NewGuid(),
                Name = generatedTrip.Name,
                StartDate = generatedTrip.StartDate,
                EndDate = generatedTrip.EndDate,
                ImageUrl = generatedTrip.ImageUrl,
            };

            dbContext.Trips.Add(trip);
            allTripWindows.Add(new TripWindow(trip.Id, generatedTrip.StartDate.Date, generatedTrip.EndDate.Date));
        }

        var merchants = GetMerchants();
        var locations = GetLocations();
        var incomeNotes = GetIncomeNotes();
        var expenseNotes = GetExpenseNotes();
        var transactionBuffer = new List<Transaction>();
        var expenseTransactions = new List<Transaction>();

        var transfersAdded = 0;
        var refundsAdded = 0;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var isTripDay = allTripWindows.Any(trip => date >= trip.StartDate && date <= trip.EndDate);
            var count = GetDailyTransactionCount(random, isTripDay);
            if (count == 0)
            {
                continue;
            }

            for (var index = 0; index < count; index++)
            {
                var type = PickTransactionType(random, expenseTransactions.Count > 0, incomeCategories.Count > 0);
                var timestamp = date.AddMinutes(random.Next(0, 24 * 60));

                if (type == TransactionType.Transfer)
                {
                    var source = PickAccount(random, allAccounts);
                    var target = PickDifferentAccount(random, allAccounts, source);
                    var amount = NextMoney(random, 20, 600);

                    var transfer = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        Date = timestamp,
                        Type = TransactionType.Transfer,
                        Amount = amount,
                        AccountId = source.Id,
                        TargetAccountId = target.Id,
                        Note = ShouldAssignNote(random, 0.06) ? "Transfer between accounts" : null,
                        MerchantName = null,
                        Location = null
                    };

                    ApplyBalances(source, target, transfer.Type, transfer.Amount);
                    transactionBuffer.Add(transfer);
                    transfersAdded++;
                    continue;
                }

                if (type == TransactionType.Refund)
                {
                    var original = PickRefundCandidate(random, expenseTransactions);
                    if (original is null)
                    {
                        type = TransactionType.Expense;
                    }
                    else
                    {
                        var refundAmount = Math.Round(original.Amount * (decimal)(0.2 + random.NextDouble() * 0.6), 2);
                        var refund = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            Date = timestamp,
                            Type = TransactionType.Refund,
                            Amount = refundAmount,
                            AccountId = original.AccountId,
                            CategoryId = original.CategoryId,
                            SubCategoryId = original.SubCategoryId,
                            TripId = original.TripId,
                            OriginalTransactionId = original.Id,
                            IsRefund = true,
                            Note = ShouldAssignNote(random, 0.10) ? "Partial refund" : null,
                            MerchantName = original.MerchantName,
                            Location = original.Location
                        };

                        var account = allAccounts.First(accountItem => accountItem.Id == original.AccountId);
                        ApplyBalances(account, null, refund.Type, refund.Amount);
                        transactionBuffer.Add(refund);
                        refundsAdded++;
                        continue;
                    }
                }

                if (type == TransactionType.Income)
                {
                    var account = PickAccount(random, allAccounts);
                    var category = PickCategory(random, incomeCategories) ?? PickCategory(random, expenseParents);
                    var amount = NextMoney(random, 500, 3500);

                    var income = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        Date = timestamp,
                        Type = TransactionType.Income,
                        Amount = amount,
                        AccountId = account.Id,
                        CategoryId = category?.Id,
                        Note = ShouldAssignNote(random, 0.20) ? PickValue(random, incomeNotes) : null,
                        MerchantName = "Employer",
                        Location = PickValue(random, locations)
                    };

                    ApplyBalances(account, null, income.Type, income.Amount);
                    transactionBuffer.Add(income);
                    continue;
                }

                var expenseAccount = PickAccount(random, allAccounts);
                var expenseAmount = random.NextDouble() < 0.1
                    ? NextMoney(random, 200, 900)
                    : NextMoney(random, 5, 200);

                var expenseParent = PickCategory(random, expenseParents);
                var expenseChild = expenseParent is not null && expenseChildrenByParent.TryGetValue(expenseParent.Id, out var children)
                    ? (random.NextDouble() < 0.6 ? PickCategory(random, children) : null)
                    : null;

                var activeTrip = PickActiveTripForDate(random, allTripWindows, timestamp.Date);
                Guid? tripId = activeTrip is not null && ShouldAssignNote(random, 0.75)
                    ? activeTrip.Id
                    : null;

                var expense = new Transaction
                {
                    Id = Guid.NewGuid(),
                    Date = timestamp,
                    Type = TransactionType.Expense,
                    Amount = expenseAmount,
                    AccountId = expenseAccount.Id,
                    TripId = tripId,
                    CategoryId = expenseParent?.Id,
                    SubCategoryId = expenseChild?.Id,
                    Note = ShouldAssignNote(random, 0.12) ? PickValue(random, expenseNotes) : null,
                    MerchantName = PickValue(random, merchants),
                    Location = PickValue(random, locations)
                };

                ApplyBalances(expenseAccount, null, expense.Type, expense.Amount);
                transactionBuffer.Add(expense);
                expenseTransactions.Add(expense);
            }
        }

        dbContext.Transactions.AddRange(transactionBuffer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new SeedResult(
            accountsAdded,
            transactionBuffer.Count,
            transfersAdded,
            refundsAdded,
            startDate,
            endDate);
    }

    private static IReadOnlyList<AccountDefinition> GetAccountDefinitions()
    {
        return
        [
            new AccountDefinition("Cash PLN", "PLN", "#2F9E44", AccountType.Cash, 1200m),
            new AccountDefinition("Cash EUR", "EUR", "#0B7285", AccountType.Cash, 400m),
            new AccountDefinition("Card PLN", "PLN", "#1971C2", AccountType.DebitCard, 3500m),
            new AccountDefinition("Card EUR", "EUR", "#364FC7", AccountType.DebitCard, 800m),
            new AccountDefinition("Revolut Card", "EUR", "#7048E8", AccountType.DebitCard, 1600m)
        ];
    }

    private static IReadOnlyList<string> GetMerchants()
    {
        return
        [
            "Luna Market",
            "Urban Cafe",
            "Metro Fuel",
            "Green Basket",
            "Skyline Pharmacy",
            "Cloud Media",
            "Sunrise Bakery",
            "Blue Harbor",
            "North Gym",
            "Corner Books"
        ];
    }

    private static IReadOnlyList<string> GetLocations()
    {
        return
        [
            "Warsaw",
            "Krakow",
            "Gdansk",
            "Wroclaw",
            "Poznan",
            "Lodz"
        ];
    }

    private static IReadOnlyList<string> GetIncomeNotes()
    {
        return
        [
            "Monthly salary",
            "Bonus payout",
            "Freelance invoice",
            "Tax return"
        ];
    }

    private static IReadOnlyList<string> GetExpenseNotes()
    {
        return
        [
            "Groceries",
            "Coffee",
            "Transport",
            "Home supplies",
            "Online order",
            "Subscription"
        ];
    }

    private static int GetDailyTransactionCount(Random random, bool isTripDay)
    {
        if (isTripDay)
        {
            var tripRoll = random.Next(0, 100);
            if (tripRoll < 8)
            {
                return 0;
            }

            if (tripRoll < 50)
            {
                return random.Next(2, 5);
            }

            if (tripRoll < 82)
            {
                return random.Next(3, 7);
            }

            return random.Next(5, 10);
        }

        var roll = random.Next(0, 100);
        if (roll < 20)
        {
            return 0;
        }

        if (roll < 70)
        {
            return random.Next(1, 3);
        }

        if (roll < 90)
        {
            return random.Next(2, 5);
        }

        return random.Next(4, 8);
    }

    private static TransactionType PickTransactionType(Random random, bool hasExpenses, bool hasIncome)
    {
        var roll = random.NextDouble();
        if (roll < 0.12 && hasIncome)
        {
            return TransactionType.Income;
        }

        if (roll < 0.88)
        {
            return TransactionType.Expense;
        }

        if (roll < 0.97)
        {
            return TransactionType.Transfer;
        }

        return hasExpenses ? TransactionType.Refund : TransactionType.Expense;
    }

    private static Account PickAccount(Random random, IReadOnlyList<Account> accounts)
    {
        return accounts[random.Next(accounts.Count)];
    }

    private static Account PickDifferentAccount(Random random, IReadOnlyList<Account> accounts, Account source)
    {
        if (accounts.Count == 1)
        {
            return source;
        }

        Account target;
        do
        {
            target = accounts[random.Next(accounts.Count)];
        }
        while (target.Id == source.Id);

        return target;
    }

    private static Category? PickCategory(Random random, IReadOnlyList<Category> categories)
    {
        return categories.Count == 0 ? null : categories[random.Next(categories.Count)];
    }

    private static Transaction? PickRefundCandidate(Random random, IReadOnlyList<Transaction> expenses)
    {
        if (expenses.Count == 0)
        {
            return null;
        }

        return expenses[random.Next(expenses.Count)];
    }

    private static string? PickValue(Random random, IReadOnlyList<string> values)
    {
        return values.Count == 0 ? null : values[random.Next(values.Count)];
    }

    private static bool ShouldAssignNote(Random random, double probability)
    {
        return random.NextDouble() < probability;
    }

    private static TripWindow? PickActiveTripForDate(Random random, IReadOnlyList<TripWindow> trips, DateTime date)
    {
        var activeTrips = trips
            .Where(trip => date >= trip.StartDate && date <= trip.EndDate)
            .ToList();

        if (activeTrips.Count == 0)
        {
            return null;
        }

        return activeTrips[random.Next(activeTrips.Count)];
    }

    private static IReadOnlyList<TripSeedDefinition> BuildTripDefinitions(DateTime startDate, DateTime endDate, Random random)
    {
        var names = new[]
        {
            "Summer getaway",
            "City break",
            "Beach vacation",
            "Mountain retreat",
            "Family visit",
            "Conference trip",
            "Road trip",
        };

        var result = new List<TripSeedDefinition>();
        for (var year = startDate.Year; year <= endDate.Year; year++)
        {
            var tripCount = random.Next(1, 3);
            for (var index = 0; index < tripCount; index++)
            {
                var startMonth = random.Next(2, 12);
                var startDay = random.Next(1, 25);
                var duration = random.Next(4, 12);

                var tripStart = new DateTime(year, startMonth, startDay, 0, 0, 0, DateTimeKind.Utc);
                var tripEnd = tripStart.AddDays(duration);

                if (tripEnd < startDate || tripStart > endDate)
                {
                    continue;
                }

                if (tripStart < startDate)
                {
                    tripStart = startDate;
                }

                if (tripEnd > endDate)
                {
                    tripEnd = endDate;
                }

                var baseName = names[random.Next(names.Length)];
                result.Add(new TripSeedDefinition(
                    $"{baseName} {tripStart:yyyy}",
                    tripStart,
                    tripEnd,
                    null));
            }
        }

        return result;
    }

    private static decimal NextMoney(Random random, int min, int max)
    {
        var major = random.Next(min, max + 1);
        var minor = random.Next(0, 100);
        return major + minor / 100m;
    }

    private static void ApplyBalances(Account account, Account? targetAccount, TransactionType type, decimal amount)
    {
        var (sourceDelta, targetDelta) = GetBalanceDeltas(type, amount);
        account.CurrentBalance += sourceDelta;

        if (targetDelta is not null && targetAccount is not null)
        {
            targetAccount.CurrentBalance += targetDelta.Value;
        }
    }

    private static (decimal SourceDelta, decimal? TargetDelta) GetBalanceDeltas(TransactionType type, decimal amount)
    {
        return type switch
        {
            TransactionType.Expense => (-amount, null),
            TransactionType.Income => (amount, null),
            TransactionType.Refund => (amount, null),
            TransactionType.Transfer => (-amount, amount),
            _ => (0m, null)
        };
    }

    private sealed record AccountDefinition(
        string Name,
        string Currency,
        string Color,
        AccountType Type,
        decimal InitialBalance);

    private sealed record TripWindow(Guid Id, DateTime StartDate, DateTime EndDate);

    private sealed record TripSeedDefinition(
        string Name,
        DateTime StartDate,
        DateTime EndDate,
        string? ImageUrl);
}
