export function getMockChatResponse(message: string): string | null {
  if (message.trim().toLowerCase() !== "test") {
    return null;
  }

  return [
    "This is a mock Ion response for UI testing.",
    "When the model is connected, replies will stream here with context from your projects, artifacts, and inbox.",
    "For now, only the word test triggers a placeholder reply.",
  ].join("\n\n");
}
