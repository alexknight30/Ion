import { db } from "@/lib/db";
import {
  badRequest,
  json,
  notFound,
  parseJsonBody,
  serverError,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{ todoId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { todoId } = await context.params;
  const body = await parseJsonBody<{
    title?: unknown;
    completed?: unknown;
    projectId?: unknown;
    position?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const data: {
    title?: string;
    completed?: boolean;
    projectId?: string | null;
    position?: number;
  } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return badRequest('"title" must be a string');
    }
    data.title = body.title;
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return badRequest('"completed" must be a boolean');
    }
    data.completed = body.completed;
  }

  if (body.projectId !== undefined) {
    if (body.projectId === null) {
      data.projectId = null;
    } else if (typeof body.projectId === "string" && body.projectId.trim()) {
      const project = await db.project.findUnique({
        where: { id: body.projectId.trim() },
        select: { id: true },
      });

      if (!project) {
        return badRequest("Project not found");
      }

      data.projectId = project.id;
    } else {
      return badRequest('"projectId" must be a string or null');
    }
  }

  if (body.position !== undefined) {
    if (typeof body.position !== "number" || !Number.isFinite(body.position)) {
      return badRequest('"position" must be a number');
    }
    data.position = body.position;
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const todo = await db.todo.update({
      where: { id: todoId },
      data,
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return json(todo);
  } catch {
    return notFound("Todo not found");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { todoId } = await context.params;

  try {
    await db.todo.delete({ where: { id: todoId } });
    return json({ ok: true });
  } catch {
    return notFound("Todo not found");
  }
}
