namespace FlametteMoney.Web.Infrastructure.AI;

/// <summary>
/// Sends a text prompt with an optional image to a vision-capable AI model
/// and returns the response deserialized as <typeparamref name="T"/>.
/// </summary>
public interface IVisionAiClient
{
    Task<T> CompleteAsync<T>(string prompt, byte[]? imageBytes = null, string? imageMimeType = null, CancellationToken cancellationToken = default);
}
