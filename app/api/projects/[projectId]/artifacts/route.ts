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

async function projectExists(projectId: string) {
  return db.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  try {
    if (!(await projectExists(projectId))) {
      return notFound("Project not found");
    }

    const artifacts = await db.artifact.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });

    return json(artifacts);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const body = await parseJsonBody<{
    title?: unknown;
    kind?: unknown;
    content?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const title = requireString(body.title, "title");
  if (title instanceof Response) return title;

  try {
    if (!(await projectExists(projectId))) {
      return notFound("Project not found");
    }

    const artifact = await db.artifact.create({
      data: {
        projectId,
        title,
        kind: optionalString(body.kind),
        content:
          typeof body.content === "string" ? body.content : undefined,
      },
    });

    return json(artifact, { status: 201 });
  } catch {
    return serverError();
  }
}
