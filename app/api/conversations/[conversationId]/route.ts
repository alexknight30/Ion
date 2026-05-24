import { db } from "@/lib/db";
import {
  badRequest,
  json,
  notFound,
  parseJsonBody,
  serverError,
} from "@/lib/api";
import {
  parsePinnedIdList,
  serializePinnedIdList,
} from "@/lib/conversation-pins";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

function formatConversation<T extends {
  pinnedProjectIds: string;
  pinnedArtifactIds: string;
}>(conversation: T) {
  return {
    ...conversation,
    pinnedProjectIds: parsePinnedIdList(conversation.pinnedProjectIds),
    pinnedArtifactIds: parsePinnedIdList(conversation.pinnedArtifactIds),
  };
}

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

    return json(formatConversation(conversation));
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const body = await parseJsonBody<{
    pinnedProjectIds?: unknown;
    pinnedArtifactIds?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  if (
    body.pinnedProjectIds !== undefined &&
    !Array.isArray(body.pinnedProjectIds)
  ) {
    return badRequest('"pinnedProjectIds" must be an array of strings');
  }

  if (
    body.pinnedArtifactIds !== undefined &&
    !Array.isArray(body.pinnedArtifactIds)
  ) {
    return badRequest('"pinnedArtifactIds" must be an array of strings');
  }

  const pinnedProjectIds =
    body.pinnedProjectIds === undefined
      ? undefined
      : [
          ...new Set(
            body.pinnedProjectIds
              .filter((entry): entry is string => typeof entry === "string")
              .map((entry) => entry.trim())
              .filter(Boolean)
          ),
        ];

  const pinnedArtifactIds =
    body.pinnedArtifactIds === undefined
      ? undefined
      : [
          ...new Set(
            body.pinnedArtifactIds
              .filter((entry): entry is string => typeof entry === "string")
              .map((entry) => entry.trim())
              .filter(Boolean)
          ),
        ];

  if (
    pinnedProjectIds === undefined &&
    pinnedArtifactIds === undefined
  ) {
    return badRequest("No valid fields to update");
  }

  try {
    const existing = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!existing) {
      return notFound("Conversation not found");
    }

    const conversation = await db.conversation.update({
      where: { id: conversationId },
      data: {
        ...(pinnedProjectIds !== undefined
          ? { pinnedProjectIds: serializePinnedIdList(pinnedProjectIds) }
          : {}),
        ...(pinnedArtifactIds !== undefined
          ? { pinnedArtifactIds: serializePinnedIdList(pinnedArtifactIds) }
          : {}),
      },
    });

    return json(formatConversation(conversation));
  } catch {
    return serverError();
  }
}
