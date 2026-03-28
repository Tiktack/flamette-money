using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FlametteMoney.Web.Infrastructure.Options;
using Microsoft.Extensions.Options;

namespace FlametteMoney.Web.Infrastructure.AI;

public sealed class OpenRouterVisionAiClient : IVisionAiClient
{
    private static readonly JsonSerializerOptions SerializeOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly OpenRouterOptions _options;

    public OpenRouterVisionAiClient(HttpClient httpClient, IOptions<OpenRouterOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<T> CompleteAsync<T>(
        string prompt,
        byte[]? imageBytes = null,
        string? imageMimeType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException("OpenRouter API key is not configured. Set OpenRouter:ApiKey in appsettings or user secrets.");
        }

        var contentParts = new List<OpenRouterContentPart>
        {
            new() { Type = "text", Text = prompt },
        };

        if (imageBytes is { Length: > 0 } && !string.IsNullOrWhiteSpace(imageMimeType))
        {
            var dataUrl = $"data:{imageMimeType};base64,{Convert.ToBase64String(imageBytes)}";
            contentParts.Add(new OpenRouterContentPart
            {
                Type = "image_url",
                ImageUrl = new OpenRouterImageUrl { Url = dataUrl },
            });
        }

        var requestBody = new OpenRouterRequest
        {
            Model = _options.Model,
            Messages = [new OpenRouterMessage { Role = "user", Content = contentParts }],
            Temperature = 0.1,
            MaxTokens = 4096,
        };

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(requestBody, SerializeOptions),
            Encoding.UTF8,
            "application/json");

        var httpResponse = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"OpenRouter API error ({httpResponse.StatusCode}): {responseBody}");
        }

        var parsed = JsonSerializer.Deserialize<OpenRouterResponse>(responseBody, DeserializeOptions);
        var rawContent = parsed?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();

        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new InvalidOperationException("AI returned an empty response.");
        }

        // Strip markdown code fences if present
        var result = rawContent;
        if (result.StartsWith("```"))
        {
            var firstNewline = result.IndexOf('\n');
            if (firstNewline > 0)
                result = result[(firstNewline + 1)..];
            if (result.EndsWith("```"))
                result = result[..^3];
            result = result.Trim();
        }

        var deserialized = JsonSerializer.Deserialize<T>(result, DeserializeOptions);
        if (deserialized is null)
        {
            throw new InvalidOperationException($"Failed to deserialize AI response into {typeof(T).Name}.");
        }

        return deserialized;
    }

    // ── Wire DTOs ───────────────────────────────────────────────────────

    private sealed class OpenRouterRequest
    {
        public string Model { get; set; } = "";
        public List<OpenRouterMessage> Messages { get; set; } = [];
        public double Temperature { get; set; }
        public int? MaxTokens { get; set; }
    }

    private sealed class OpenRouterMessage
    {
        public string Role { get; set; } = "";
        public List<OpenRouterContentPart> Content { get; set; } = [];
    }

    private sealed class OpenRouterContentPart
    {
        public string Type { get; set; } = "";
        public string? Text { get; set; }
        public OpenRouterImageUrl? ImageUrl { get; set; }
    }

    private sealed class OpenRouterImageUrl
    {
        public string Url { get; set; } = "";
    }

    private sealed class OpenRouterResponse
    {
        public List<OpenRouterChoice>? Choices { get; set; }
    }

    private sealed class OpenRouterChoice
    {
        public OpenRouterChoiceMessage? Message { get; set; }
    }

    private sealed class OpenRouterChoiceMessage
    {
        public string? Content { get; set; }
    }
}
