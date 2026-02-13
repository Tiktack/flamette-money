using FlametteMoney.Web.Infrastructure.Database.Models;

namespace FlametteMoney.Web.Infrastructure.Database;

public static class UserScopeQueryableExtensions
{
    public static IQueryable<TEntity> ForUser<TEntity>(this IQueryable<TEntity> query, Guid userId)
        where TEntity : class, IUserOwnedEntity
    {
        return query.Where(entity => entity.UserId == userId);
    }
}
