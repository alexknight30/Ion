import { db } from "@/lib/db";
import { assembleContext } from "@/lib/context";
import {
  buildSystemPrompt,
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
  };
};

export type ParsedAgentRequest = {
  message: string;
  conversationId?: string;
  currentTab: string;
  currentDate: string;
  activeProjectId?: string | null;
  activeArtifactId?: string | null;
};

export type AgentRunResult = {
  conversationId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
};

export function optionalId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.trim();
}

function deriveConversationTitle(message: string) {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New conversation";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

type AnthropicStreamEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
  message?: { usage?: { input_tokens?: number; output_tokens?: number } };
  usage?: { input_tokens?: number; output_tokens?: number };
};

export async function prepareAgentRun(body: ParsedAgentRequest) {
  const config = await db.agentConfig.upsert({
    where: { id: AGENT_CONFIG_ID },
    create: { id: AGENT_CONFIG_ID },
    update: {},
  });

  if (!config.apiKey) {
    throw new Error("No API key configured — add one in Settings.");
  }

  const madContext = await assembleContext({
    currentTab: body.currentTab.toLowerCase(),
    currentDate: body.currentDate,
    activeProjectId: body.activeProjectId,
    activeArtifactId: body.activeArtifactId,
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

  const conversationHistory = getRecentConversationHistory(priorMessages);
  const systemPrompt = buildSystemPrompt(madContext, conversationHistory);

  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: body.message,
    },
  });

  if (!conversation.title) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { title: deriveConversationTitle(body.message) },
    });
  }

  return {
    config,
    madContext,
    conversationId: conversation.id,
    systemPrompt,
  };
}

export async function streamAnthropicReply(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  message: string;
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
        params.onDelta(parsed.delta.text);
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

  return { reply, inputTokens, outputTokens };
}

export async function finalizeAgentRun(params: {
  conversationId: string;
  madContext: Awaited<ReturnType<typeof assembleContext>>;
  reply: string;
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
    data: { updatedAt: new Date() },
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
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    priceUsd,
  };
}

export function encodeSse(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
