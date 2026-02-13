using System.Security.Claims;

namespace FlametteMoney.Web.Infrastructure.Auth;

public interface ICurrentUserContext
{
    Guid? UserId { get; }
    bool IsAuthenticated { get; }
}

public sealed class HttpCurrentUserContext(IHttpContextAccessor httpContextAccessor) : ICurrentUserContext
{
    public Guid? UserId
    {
        get
        {
            var user = httpContextAccessor.HttpContext?.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var userIdValue = user.FindFirstValue(AppClaimTypes.UserId);
            if (Guid.TryParse(userIdValue, out var userId))
            {
                return userId;
            }

            return null;
        }
    }

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;
}

public static class CurrentUserContextExtensions
{
    private static readonly Guid MissingUserId = Guid.Parse("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF");

    public static Guid GetScopedUserId(this ICurrentUserContext currentUserContext)
    {
        return currentUserContext.UserId ?? MissingUserId;
    }
}
