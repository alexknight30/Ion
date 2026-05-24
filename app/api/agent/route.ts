import {
  badRequest,
  parseJsonBody,
  requireString,
} from "@/lib/api";
import {
  DATE_PATTERN,
  encodeSse,
  finalizeAgentRun,
  optionalId,
  prepareAgentRun,
  streamAnthropicReply,
  type AgentRequestBody,
  type ParsedAgentRequest,
} from "@/lib/agent/handler";

function parseAgentRequest(body: AgentRequestBody): ParsedAgentRequest | Response {
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

  return {
    message,
    conversationId,
    currentTab,
    currentDate: body.context.currentDate,
    activeProjectId,
    activeArtifactId,
  };
}

export async function POST(request: Request) {
  const body = await parseJsonBody<AgentRequestBody>(request);
  if (body instanceof Response) return body;

  const parsed = parseAgentRequest(body);
  if (parsed instanceof Response) return parsed;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const prepared = await prepareAgentRun(parsed);

        send("meta", { conversationId: prepared.conversationId });

        const { reply, inputTokens, outputTokens } = await streamAnthropicReply({
          apiKey: prepared.config.apiKey!,
          model: prepared.config.model,
          systemPrompt: prepared.systemPrompt,
          message: parsed.message,
          onDelta: (text) => {
            send("delta", { text });
          },
        });

        const result = await finalizeAgentRun({
          conversationId: prepared.conversationId,
          madContext: prepared.madContext,
          reply,
          model: prepared.config.model,
          currentDate: parsed.currentDate,
          inputTokens,
          outputTokens,
        });

        send("done", {
          conversationId: result.conversationId,
          reply: result.reply,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal server error";

        if (message === "Conversation not found") {
          send("error", { message });
        } else if (message.startsWith("No API key configured")) {
          send("error", { message });
        } else {
          console.error("[agent POST]", error);
          send("error", { message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
