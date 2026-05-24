import { db } from "@/lib/db";
import { json, serverError } from "@/lib/api";

function deriveConversationTitle(message: string) {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

async function resolveConversationTitle(
  conversationId: string,
  title: string | null
) {
  if (title?.trim()) return title;

  const firstUserMessage = await db.message.findFirst({
    where: { conversationId, role: "user" },
    orderBy: { createdAt: "asc" },
    select: { content: true },
  });

  return firstUserMessage
    ? deriveConversationTitle(firstUserMessage.content)
    : null;
}

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    const enriched = await Promise.all(
      conversations.map(async (conversation) => ({
        id: conversation.id,
        title: await resolveConversationTitle(
          conversation.id,
          conversation.title
        ),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation._count.messages,
      }))
    );

    return json(enriched);
  } catch {
    return serverError();
  }
}

export async function POST() {
  try {
    const conversation = await db.conversation.create({ data: {} });
    return json(
      {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: 0,
      },
      { status: 201 }
    );
  } catch {
    return serverError();
  }
}
