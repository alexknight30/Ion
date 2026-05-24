export type AgentContextParams = {
  currentTab: string;
  currentDate: string;
  activeProjectId?: string | null;
  activeArtifactId?: string | null;
};

export type SendAgentMessageInput = {
  message: string;
  conversationId?: string | null;
  context: AgentContextParams;
};

export type SendAgentMessageResult = {
  reply: string;
  conversationId: string;
};

export async function sendAgentMessage(
  input: SendAgentMessageInput
): Promise<SendAgentMessageResult> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      conversationId: input.conversationId ?? undefined,
      context: input.context,
    }),
  });

  const data = (await response.json()) as {
    reply?: string;
    conversationId?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to send message");
  }

  if (!data.reply || !data.conversationId) {
    throw new Error("Invalid agent response");
  }

  return {
    reply: data.reply,
    conversationId: data.conversationId,
  };
}
