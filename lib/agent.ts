export type AgentContextParams = {
  currentTab: string;
  currentDate: string;
  activeProjectId?: string | null;
  activeArtifactId?: string | null;
  pinnedProjectIds?: string[];
  pinnedArtifactIds?: string[];
};

export type StreamAgentMessageInput = {
  message: string;
  conversationId?: string | null;
  context: AgentContextParams;
  onMeta?: (data: { conversationId: string }) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: {
    conversationId: string;
    reply: string;
    title?: string | null;
    inputTokens?: number;
    outputTokens?: number;
  }) => void;
  signal?: AbortSignal;
};

export type StreamAgentMessageResult = {
  conversationId: string;
  reply: string;
};

function parseSseBlock(block: string) {
  const lines = block.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return null;

  try {
    return { event, data: JSON.parse(data) as Record<string, unknown> };
  } catch {
    return null;
  }
}

export async function streamAgentMessage(
  input: StreamAgentMessageInput
): Promise<StreamAgentMessageResult> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      conversationId: input.conversationId ?? undefined,
      context: input.context,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    let message = "Failed to send message";
    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("No response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let conversationId = input.conversationId ?? "";
  let reply = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const parsed = parseSseBlock(block);
      if (!parsed) continue;

      if (parsed.event === "meta") {
        conversationId = String(parsed.data.conversationId ?? conversationId);
        input.onMeta?.({ conversationId });
      }

      if (parsed.event === "delta" && typeof parsed.data.text === "string") {
        reply += parsed.data.text;
        input.onDelta?.(parsed.data.text);
      }

      if (parsed.event === "done") {
        conversationId = String(parsed.data.conversationId ?? conversationId);
        reply = String(parsed.data.reply ?? reply);
        input.onDone?.({
          conversationId,
          reply,
          title:
            typeof parsed.data.title === "string"
              ? parsed.data.title
              : parsed.data.title === null
                ? null
                : undefined,
          inputTokens:
            typeof parsed.data.inputTokens === "number"
              ? parsed.data.inputTokens
              : undefined,
          outputTokens:
            typeof parsed.data.outputTokens === "number"
              ? parsed.data.outputTokens
              : undefined,
        });
      }

      if (parsed.event === "error") {
        throw new Error(
          typeof parsed.data.message === "string"
            ? parsed.data.message
            : "Failed to send message"
        );
      }
    }
  }

  if (!conversationId || !reply) {
    throw new Error("Invalid agent response");
  }

  return { conversationId, reply };
}

/** @deprecated Use streamAgentMessage instead */
export async function sendAgentMessage(
  input: Omit<StreamAgentMessageInput, "onMeta" | "onDelta" | "onDone">
) {
  return streamAgentMessage(input);
}
