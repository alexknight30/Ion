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
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        artifacts: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!project) return notFound("Project not found");

    return json(project);
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const body = await parseJsonBody<{
    name?: unknown;
    description?: unknown;
    workType?: unknown;
    color?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const data: {
    name?: string;
    description?: string | null;
    workType?: string | null;
    color?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = requireString(body.name, "name");
    if (name instanceof Response) return name;
    data.name = name;
  }

  if (body.description !== undefined) {
    data.description = optionalString(body.description) ?? null;
  }

  if (body.workType !== undefined) {
    data.workType = optionalString(body.workType) ?? null;
  }

  if (body.color !== undefined) {
    data.color = optionalString(body.color) ?? null;
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const project = await db.project.update({
      where: { id: projectId },
      data,
    });

    return json(project);
  } catch {
    return notFound("Project not found");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  try {
    await db.project.delete({ where: { id: projectId } });
    return json({ ok: true });
  } catch {
    return notFound("Project not found");
  }
}
