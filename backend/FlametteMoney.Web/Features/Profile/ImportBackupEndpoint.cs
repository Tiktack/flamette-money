using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

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

        if (!OneMoneyBackupImporter.IsSupportedType(type))
        {
            return TypedResults.BadRequest("Unsupported backup type. Use 'one-money'.");
        }

        var userId = currentUserContext.GetScopedUserId();
        try
        {
            await using var stream = file.OpenReadStream();
            var result = await OneMoneyBackupImporter.ImportAsync(stream, dbContext, userId, cancellationToken);

            return TypedResults.Ok(new ImportBackupResponse(
                "one-money",
                result.ImportedTransactions,
                result.ImportedAccounts,
                result.ImportedCategories,
                result.ImportedSubCategories,
                result.UpdatedBalanceSnapshots,
                result.SkippedRows));
        }
        catch (InvalidOperationException exception)
        {
            return TypedResults.BadRequest(exception.Message);
        }
    }
}
