using FlametteMoney.Web.Infrastructure.Database.Models;

namespace FlametteMoney.Web.Features.Accounts;

public record CreateAccountRequest(string Name, string Currency, AccountType Type, decimal InitialBalance);

public record UpdateAccountRequest(string Name, AccountType Type);

public record AccountSummaryResponse(
    Guid Id,
    string Name,
    string Currency,
    AccountType Type,
    decimal InitialBalance,
    decimal CurrentBalance);

public record AccountDetailResponse(
    Guid Id,
    string Name,
    string Currency,
    AccountType Type,
    decimal InitialBalance,
    decimal CurrentBalance);
