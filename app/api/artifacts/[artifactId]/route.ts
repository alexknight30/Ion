import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  json,
  notFound,
  optionalString,
  parseJsonBody,
  requireString,
  serverError,
} from "@/lib/api";
import { MISC_THOUGHTS_TITLE } from "@/lib/artifact-constants";

type RouteContext = {
  params: Promise<{ artifactId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  try {
    const artifact = await db.artifact.findUnique({
      where: { id: artifactId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        notes: {
          orderBy: { createdAt: "asc" },
        },
      },
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

  try {
    const existing = await db.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!existing) return notFound("Artifact not found");

    const data: Prisma.ArtifactUncheckedUpdateInput = {};

    if (body.title !== undefined) {
      const title = requireString(body.title, "title");
      if (title instanceof Response) return title;
      data.title = title;
    }

    if (body.kind !== undefined) {
      const kind = optionalString(body.kind);
      if (kind) data.kind = kind;
    }

    if (body.content !== undefined) {
      data.content =
        typeof body.content === "string" ? body.content : null;
    }

    if (body.projectId !== undefined) {
      if (existing.title === MISC_THOUGHTS_TITLE && existing.isSystem) {
        return badRequest("misc-thoughts must remain unassigned to a project");
      }

      if (body.projectId === null) {
        if (!existing.isSystem || existing.title !== MISC_THOUGHTS_TITLE) {
          return badRequest("Only misc-thoughts can be unassigned from a project");
        }
        data.projectId = null;
      } else {
        const projectId = requireString(body.projectId, "projectId");
        if (projectId instanceof Response) return projectId;

        const project = await db.project.findUnique({
          where: { id: projectId },
          select: { id: true },
        });

        if (!project) return notFound("Project not found");
        data.projectId = projectId;
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields to update");
    }

    const artifact = await db.artifact.update({
      where: { id: artifactId },
      data,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        notes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return json(artifact);
  } catch {
    return notFound("Artifact not found");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  try {
    const existing = await db.artifact.findUnique({
      where: { id: artifactId },
      select: { isSystem: true },
    });

    if (!existing) return notFound("Artifact not found");
    if (existing.isSystem) {
      return badRequest("System artifacts cannot be deleted");
    }

    await db.artifact.delete({ where: { id: artifactId } });
    return json({ ok: true });
  } catch {
    return notFound("Artifact not found");
  }
}
