using Carter;
using FlametteMoney.Web.Infrastructure.Currency;
using FlametteMoney.Web.Infrastructure.Auth;
using FlametteMoney.Web.Infrastructure.Database;
using FlametteMoney.Web.Infrastructure.Database.Seeding;
using FlametteMoney.Web.Infrastructure.Options;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Scalar.AspNetCore;
using System.Reflection;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var isOpenApiGeneration = Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";

if (!isOpenApiGeneration)
{
    builder.AddServiceDefaults();
}

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddCarter();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();
builder.Services.Configure<ExchangeRateApiOptions>(builder.Configuration.GetSection(ExchangeRateApiOptions.SectionName));
builder.Services.AddHttpClient("ExchangeRateApi");
builder.Services.AddScoped<IExchangeRateService, ExchangeRateService>();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=flamette-money.db"));
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
    })
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
    {
        options.LoginPath = "/api/auth/login/google";
        options.LogoutPath = "/api/auth/logout";
    })
    .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? string.Empty;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? string.Empty;
        options.SaveTokens = true;
        options.CallbackPath = "/signin-google";

        options.Events.OnCreatingTicket = async context =>
        {
            var principal = context.Principal;
            var identity = context.Identity;
            if (principal is null || identity is null)
            {
                return;
            }

            var subject = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = principal.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var name = principal.FindFirstValue(ClaimTypes.Name) ?? email;
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var cancellationToken = context.HttpContext.RequestAborted;

            var user = await dbContext.Users
                .FirstOrDefaultAsync(item => item.GoogleSubject == subject, cancellationToken);

            if (user is null)
            {
                user = new FlametteMoney.Web.Infrastructure.Database.Models.User
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Email = email,
                    GoogleSubject = subject,
                    BaseCurrency = "USD",
                    SubscriptionType = FlametteMoney.Web.Infrastructure.Database.Models.SubscriptionType.Free
                };

                dbContext.Users.Add(user);
            }
            else
            {
                user.Name = name;
                user.Email = email;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await UserCategoryBootstrapper.EnsureForUserAsync(dbContext, user.Id, cancellationToken);

            if (!identity.HasClaim(claim => claim.Type == AppClaimTypes.UserId))
            {
                identity.AddClaim(new Claim(AppClaimTypes.UserId, user.Id.ToString()));
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
    options.AddPolicy("FrontendDev", policy =>
        policy.WithOrigins("http://localhost:5224")
            .AllowAnyHeader()
            .AllowAnyMethod()));

var app = builder.Build();

if (!isOpenApiGeneration)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup(string.Empty)
    .RequireAuthorization();

api.MapCarter();
app.MapDefaultEndpoints();

app.Run();
