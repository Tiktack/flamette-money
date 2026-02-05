---
applyTo: '**/*.cs'
---

# Project Context & Coding Guidelines

## Project Architecture
This project uses **ASP.NET Core Minimal APIs** with **Carter** for module-based endpoint routing.

### Folder Structure

```
Features/
└── [Group]/
    └── [FeatureName]/
        ├── [FeatureName]Endpoint.cs
        ├── [FeatureName]Validator.cs
        ├── [FeatureName]Projections.cs
        └── Entities/
            └── [FeatureEntity].cs

Infrastructure/
├── Database/
│   ├── Models/
│   ├── Configurations/
│   └── [Name]DbContext.cs
├── Options/
│   └── [Setting]Options.cs
└── [Other]/ (Auth, Logging, etc.)
```

#### 1. Features
Organize code by feature. Each feature should be self-contained.
- **Pattern:** `Features/[FeatureName]/[FeatureName]Endpoint.cs` or `Features/[Group]/[FeatureName]/[FeatureName]Endpoint.cs`.
- **Entities:** Feature-specific entities MUST go into a nested `Entities` folder.
- **Components:** Projections, validators, and mappers live in the feature folder.

#### 2. Infrastructure
Infrastructure-related code lives in the `Infrastructure` folder.
- **Database:** Schema files in `Models/`, EF Core configs in `Configurations/`, and the `DbContext` at the root of `Database/`.
- **Options:** Use `IOptions` pattern. DTOs live in `Infrastructure/Options/`.

## Coding Guidelines

### Carter Endpoint Pattern
Each endpoint is a class implementing `ICarterModule`. We strictly use `TypedResults` and `Task<Results<...>>` for type-safe responses.

```csharp
public class GetUserEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/users/{userId:int}", Handle)
            .WithTags("UserManagement")
            .WithSummary("Get user details")
            .WithDescription("Retrieve detailed information about a specific user by its ID.")
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    private static async Task<Results<Ok<UserDetailResponse>, NotFound>> Handle(
        [FromRoute] int userId,
        [FromServices] AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (userId <= 0)
        {
            return TypedResults.NotFound();
        }
        
        // Implementation logic...
        
        return TypedResults.Ok(new UserDetailResponse(...));
    }
}
```

### Key Requirements:
- **Return Types:** Always use `Task<Results<T1, T2, ...>>` for the handler signature.
- **TypedResults:** Use `TypedResults` (e.g., `TypedResults.Ok()`, `TypedResults.NotFound()`) rather than `Results`.
- **Static Handlers:** Prefer `static` handler methods to avoid unintended state capture and improve performance.
- **Dependency Injection:** Use `[FromServices]` or other attributes in the handler method signature instead of constructor injection where possible for endpoints.

### Database (EF Core)
- Use Fluent API for entity configurations in `Infrastructure/Database/Configurations/`.
- Keep the `DbContext` clean; move configurations to separate classes implementing `IEntityTypeConfiguration<T>`.

### General
- Favor `records` for DTOs and Requests/Responses.
- Use `FluentValidation` for request validation, located within the feature folder.
- Follow Clean Code principles: short methods, descriptive names, and single responsibility.
