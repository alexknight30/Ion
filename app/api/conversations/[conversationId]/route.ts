import { db } from "@/lib/db";
import { json, notFound, serverError } from "@/lib/api";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params;

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return notFound("Conversation not found");
    }

    return json(conversation);
  } catch {
    return serverError();
  }
}
