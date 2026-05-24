import { db } from "@/lib/db";
import {
  badRequest,
  json,
  notFound,
  parseJsonBody,
  requireString,
  serverError,
} from "@/lib/api";
import { assembleContext } from "@/lib/context";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";

const AGENT_CONFIG_ID = "default";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type AgentRequestBody = {
  message?: unknown;
  conversationId?: unknown;
  context?: {
    currentTab?: unknown;
    currentDate?: unknown;
    activeProjectId?: unknown;
    activeArtifactId?: unknown;
  };
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function optionalId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.trim();
}

export async function POST(request: Request) {
  const body = await parseJsonBody<AgentRequestBody>(request);
  if (body instanceof Response) return body;

  const message = requireString(body.message, "message");
  if (message instanceof Response) return message;

  if (!body.context || typeof body.context !== "object") {
    return badRequest('"context" is required');
  }

  const currentTab = requireString(body.context.currentTab, "context.currentTab");
  if (currentTab instanceof Response) return currentTab;

  if (
    typeof body.context.currentDate !== "string" ||
    !DATE_PATTERN.test(body.context.currentDate)
  ) {
    return badRequest('"context.currentDate" must be a valid YYYY-MM-DD string');
  }

  const activeProjectId = optionalId(body.context.activeProjectId);
  const activeArtifactId = optionalId(body.context.activeArtifactId);

  if (
    body.context.activeProjectId !== undefined &&
    body.context.activeProjectId !== null &&
    activeProjectId === undefined
  ) {
    return badRequest('"context.activeProjectId" must be a string or null');
  }

  if (
    body.context.activeArtifactId !== undefined &&
    body.context.activeArtifactId !== null &&
    activeArtifactId === undefined
  ) {
    return badRequest('"context.activeArtifactId" must be a string or null');
  }

  let conversationId: string | undefined;
  if (body.conversationId !== undefined) {
    if (typeof body.conversationId !== "string" || !body.conversationId.trim()) {
      return badRequest('"conversationId" must be a non-empty string');
    }
    conversationId = body.conversationId.trim();
  }

  try {
    const config = await db.agentConfig.upsert({
      where: { id: AGENT_CONFIG_ID },
      create: { id: AGENT_CONFIG_ID },
      update: {},
    });

    if (!config.apiKey) {
      return badRequest("No API key configured — add one in Settings.");
    }

    const madContext = await assembleContext({
      currentTab: currentTab.toLowerCase(),
      currentDate: body.context.currentDate,
      activeProjectId,
      activeArtifactId,
    });

    const systemPrompt = buildSystemPrompt(madContext);

    let conversation = conversationId
      ? await db.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : null;

    if (conversationId && !conversation) {
      return notFound("Conversation not found");
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {},
        include: { messages: true },
      });
    }

    const priorMessages: AnthropicMessage[] = conversation.messages.map(
      (entry) => ({
        role: entry.role as "user" | "assistant",
        content: entry.content,
      })
    );

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...priorMessages,
          { role: "user", content: message },
        ],
      }),
    });

    const anthropicData = (await anthropicResponse.json()) as AnthropicResponse;

    if (!anthropicResponse.ok) {
      return badRequest(
        anthropicData.error?.message ?? "Anthropic API request failed"
      );
    }

    const reply = anthropicData.content
      ?.map((block) => (block.type === "text" ? block.text ?? "" : ""))
      .join("")
      .trim();

    if (!reply) {
      return serverError("Empty response from Anthropic API");
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        contextSnapshot: JSON.stringify(madContext),
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return json({
      reply,
      conversationId: conversation.id,
    });
  } catch {
    return serverError();
  }
}
