import { db } from "@/lib/db";
import { json, serverError } from "@/lib/api";

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return json(conversations);
  } catch {
    return serverError();
  }
}

export async function POST() {
  try {
    const conversation = await db.conversation.create({ data: {} });
    return json(conversation, { status: 201 });
  } catch {
    return serverError();
  }
}
