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
  params: Promise<{ artifactId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  try {
    const artifact = await db.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) return notFound("Artifact not found");
    return json(artifact);
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { artifactId } = await context.params;
  const body = await parseJsonBody<{
    title?: unknown;
    kind?: unknown;
    content?: unknown;
    projectId?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const data: {
    title?: string;
    kind?: string | null;
    content?: string | null;
    projectId?: string;
  } = {};

  if (body.title !== undefined) {
    const title = requireString(body.title, "title");
    if (title instanceof Response) return title;
    data.title = title;
  }

  if (body.kind !== undefined) {
    data.kind = optionalString(body.kind) ?? null;
  }

  if (body.content !== undefined) {
    data.content =
      typeof body.content === "string" ? body.content : null;
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
    const artifact = await db.artifact.update({
      where: { id: artifactId },
      data,
    });

    return json(artifact);
  } catch {
    return notFound("Artifact not found");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  try {
    await db.artifact.delete({ where: { id: artifactId } });
    return json({ ok: true });
  } catch {
    return notFound("Artifact not found");
  }
}
