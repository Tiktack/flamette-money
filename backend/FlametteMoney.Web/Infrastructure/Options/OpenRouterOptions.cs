namespace FlametteMoney.Web.Infrastructure.Options;

public sealed class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "nvidia/llama-3.3-nemotron-super-49b-v1:free";
}
