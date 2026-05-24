import { db } from "@/lib/db";
import { assembleContext } from "@/lib/context";
import {
  buildSystemPrompt,
  createTitleStreamFilter,
  extractConversationTitle,
  getRecentConversationHistory,
  type ConversationHistoryMessage,
} from "@/lib/agent/system-prompt";
import { estimateTokenPriceUsd } from "@/lib/agent/pricing";
import { logTokenUsage } from "@/lib/usage-server";

export const AGENT_CONFIG_ID = "default";
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AgentRequestBody = {
  message?: unknown;
  conversationId?: unknown;
  context?: {
    currentTab?: unknown;
    currentDate?: unknown;
    activeProjectId?: unknown;
    activeArtifactId?: unknown;
    pinnedProjectIds?: unknown;
    pinnedArtifactIds?: unknown;
  };
};

export type ParsedAgentRequest = {
  message: string;
  conversationId?: string;
  currentTab: string;
  currentDate: string;
  activeProjectId?: string | null;
  activeArtifactId?: string | null;
  pinnedProjectIds: string[];
  pinnedArtifactIds: string[];
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
  message?: { usage?: { input_tokens?: number; output_tokens?: number } };
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function optionalId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.trim();
}

export function parseIdArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;

  const ids = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set(ids)];
}

export async function prepareAgentRun(body: ParsedAgentRequest) {
  const config = await db.agentConfig.upsert({
    where: { id: AGENT_CONFIG_ID },
    create: { id: AGENT_CONFIG_ID },
    update: {},
  });

  if (!config.apiKey) {
    throw new Error("No API key configured — add one in Settings.");
  }

  const activeProjectId =
    body.activeProjectId ?? body.pinnedProjectIds[0] ?? null;
  const activeArtifactId =
    body.activeArtifactId ?? body.pinnedArtifactIds[0] ?? null;

  const madContext = await assembleContext({
    currentTab: body.currentTab.toLowerCase(),
    currentDate: body.currentDate,
    activeProjectId,
    activeArtifactId,
    pinnedProjectIds: body.pinnedProjectIds,
    pinnedArtifactIds: body.pinnedArtifactIds,
  });

  let conversation = body.conversationId
    ? await db.conversation.findUnique({
        where: { id: body.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (body.conversationId && !conversation) {
    throw new Error("Conversation not found");
  }

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {},
      include: { messages: true },
    });
  }

  const priorMessages: ConversationHistoryMessage[] = conversation.messages.map(
    (entry) => ({
      role: entry.role as "user" | "assistant",
      content: entry.content,
    })
  );

  const isFirstMessage = priorMessages.length === 0;
  const conversationHistory = getRecentConversationHistory(priorMessages);
  const systemPrompt = buildSystemPrompt(madContext, conversationHistory, {
    isFirstMessage,
  });

  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: body.message,
    },
  });

  return {
    config,
    madContext,
    conversationId: conversation.id,
    systemPrompt,
    isFirstMessage,
    needsTitle: isFirstMessage && !conversation.title,
  };
}

export async function streamAnthropicReply(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  message: string;
  stripTitle?: boolean;
  onDelta: (text: string) => void;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 1024,
      stream: true,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.message }],
    }),
  });

  if (!response.ok || !response.body) {
    let errorMessage = "Anthropic API request failed";
    try {
      const errorData = (await response.json()) as {
        error?: { message?: string };
      };
      errorMessage = errorData.error?.message ?? errorMessage;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const filterTitle = params.stripTitle ? createTitleStreamFilter() : null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventName = "message";
      let dataLine = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLine += line.slice(5).trim();
        }
      }

      if (!dataLine || dataLine === "[DONE]") continue;

      let parsed: AnthropicStreamEvent;
      try {
        parsed = JSON.parse(dataLine) as AnthropicStreamEvent;
      } catch {
        continue;
      }

      if (
        eventName === "content_block_delta" &&
        parsed.delta?.type === "text_delta" &&
        parsed.delta.text
      ) {
        reply += parsed.delta.text;
        const visibleText = filterTitle
          ? filterTitle(parsed.delta.text)
          : parsed.delta.text;
        if (visibleText) {
          params.onDelta(visibleText);
        }
      }

      if (eventName === "message_start" && parsed.message?.usage) {
        inputTokens = parsed.message.usage.input_tokens ?? inputTokens;
        outputTokens = parsed.message.usage.output_tokens ?? outputTokens;
      }

      if (eventName === "message_delta" && parsed.usage) {
        outputTokens = parsed.usage.output_tokens ?? outputTokens;
      }
    }
  }

  reply = reply.trim();
  if (!reply) {
    throw new Error("Empty response from Anthropic API");
  }

  const parsedReply = params.stripTitle
    ? extractConversationTitle(reply)
    : { title: null, content: reply };

  return {
    reply: parsedReply.content,
    title: parsedReply.title,
    inputTokens,
    outputTokens,
  };
}

export async function finalizeAgentRun(params: {
  conversationId: string;
  madContext: Awaited<ReturnType<typeof assembleContext>>;
  reply: string;
  title?: string | null;
  model: string;
  currentDate: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await db.message.create({
    data: {
      conversationId: params.conversationId,
      role: "assistant",
      content: params.reply,
      contextSnapshot: JSON.stringify(params.madContext),
    },
  });

  await db.conversation.update({
    where: { id: params.conversationId },
    data: {
      updatedAt: new Date(),
      ...(params.title ? { title: params.title } : {}),
    },
  });

  const priceUsd = estimateTokenPriceUsd(
    params.model,
    params.inputTokens,
    params.outputTokens
  );

  await logTokenUsage({
    date: params.currentDate,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    priceUsd,
  });

  return {
    conversationId: params.conversationId,
    reply: params.reply,
    title: params.title ?? null,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    priceUsd,
  };
}

export function encodeSse(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
