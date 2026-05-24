import { db } from "@/lib/db";
import {
  badRequest,
  json,
  notFound,
  parseJsonBody,
  requireString,
  serverError,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const body = await parseJsonBody<{
    role?: unknown;
    content?: unknown;
    contextSnapshot?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  if (body.role !== "user" && body.role !== "assistant") {
    return badRequest('"role" must be "user" or "assistant"');
  }

  const content = requireString(body.content, "content");
  if (content instanceof Response) return content;

  let contextSnapshot: string | null = null;
  if (body.contextSnapshot !== undefined && body.contextSnapshot !== null) {
    if (typeof body.contextSnapshot !== "string") {
      return badRequest('"contextSnapshot" must be a string or null');
    }
    contextSnapshot = body.contextSnapshot;
  }

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      return notFound("Conversation not found");
    }

    const message = await db.message.create({
      data: {
        conversationId,
        role: body.role,
        content,
        contextSnapshot,
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return json(message, { status: 201 });
  } catch {
    return serverError();
  }
}
