import { db } from "@/lib/db";
import {
  badRequest,
  json,
  notFound,
  optionalString,
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
    title?: unknown;
    content?: unknown;
    projectId?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const data: {
    title?: string | null;
    content?: string;
    projectId?: string;
  } = {};

  if (body.title !== undefined) {
    data.title = optionalString(body.title) ?? null;
  }

  if (typeof body.content === "string") {
    data.content = body.content;
  }

  if (body.projectId !== undefined) {
    const projectId = requireString(body.projectId, "projectId");
    if (projectId instanceof Response) return projectId;

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) return notFound("Project not found");
    data.projectId = projectId;
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const note = await db.note.update({
      where: { id: noteId },
      data,
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
