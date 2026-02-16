using Carter;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FlametteMoney.Web.Features.Profile;

public sealed class ExportBackupEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/profile/export-backup", Handle)
            .WithTags("Profile")
            .WithSummary("Export user backup")
            .WithDescription("Exports accounts, categories, transactions, items, and settings in native Flamette XLSX format.")
            .Produces(StatusCodes.Status200OK, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .Produces(StatusCodes.Status400BadRequest);
    }

    private static async Task<Results<FileContentHttpResult, BadRequest<string>>> Handle(
        [FromQuery] string? type,
        [FromServices] ICurrentUserContext currentUserContext,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var requestedType = string.IsNullOrWhiteSpace(type) ? "flamette" : type.Trim();
        if (!FlametteBackupPorter.IsSupportedType(requestedType))
        {
            return TypedResults.BadRequest("Unsupported backup type. Use 'flamette'.");
        }

        var userId = currentUserContext.GetScopedUserId();

        try
        {
            var payload = await FlametteBackupPorter.ExportAsync(dbContext, userId, cancellationToken);
            var fileName = $"flamette-backup-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";

            return TypedResults.File(payload, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (InvalidOperationException exception)
        {
            return TypedResults.BadRequest(exception.Message);
        }
    }
}