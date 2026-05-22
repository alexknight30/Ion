import { db } from "@/lib/db";
import {
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

    const notes = await db.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });

    return json(notes);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const body = await parseJsonBody<{
    title?: unknown;
    content?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  try {
    if (!(await projectExists(projectId))) {
      return notFound("Project not found");
    }

    const note = await db.note.create({
      data: {
        projectId,
        title: optionalString(body.title),
        content:
          typeof body.content === "string" ? body.content : "",
      },
    });

    return json(note, { status: 201 });
  } catch {
    return serverError();
  }
}
