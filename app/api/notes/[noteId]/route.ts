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
  params: Promise<{ noteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { noteId } = await context.params;

  try {
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) return notFound("Note not found");
    return json(note);
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { noteId } = await context.params;
  const body = await parseJsonBody<{
    content?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  if (typeof body.content !== "string") {
    return badRequest("No valid fields to update");
  }

  try {
    const note = await db.note.update({
      where: { id: noteId },
      data: { content: body.content },
    });

    return json(note);
  } catch {
    return notFound("Note not found");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { noteId } = await context.params;

  try {
    await db.note.delete({ where: { id: noteId } });
    return json({ ok: true });
  } catch {
    return notFound("Note not found");
  }
}
