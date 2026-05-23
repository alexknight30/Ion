import { db } from "@/lib/db";
import {
  badRequest,
  json,
  optionalString,
  parseJsonBody,
  serverError,
} from "@/lib/api";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | null) {
  if (!value || !DATE_PATTERN.test(value)) {
    return badRequest('A valid "date" query parameter is required (YYYY-MM-DD)');
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = parseDateParam(searchParams.get("date"));
  if (date instanceof Response) return date;

  try {
    const todos = await db.todo.findMany({
      where: { date },
      orderBy: [
        { completed: "asc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return json(todos);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody<{
    date?: unknown;
    title?: unknown;
    projectId?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  if (typeof body.date !== "string" || !DATE_PATTERN.test(body.date)) {
    return badRequest('"date" must be a valid YYYY-MM-DD string');
  }

  const title = typeof body.title === "string" ? body.title : "";
  let projectId: string | null | undefined;

  if (body.projectId === null) {
    projectId = null;
  } else if (body.projectId !== undefined) {
    if (typeof body.projectId !== "string" || !body.projectId.trim()) {
      return badRequest('"projectId" must be a string or null');
    }

    const project = await db.project.findUnique({
      where: { id: body.projectId.trim() },
      select: { id: true },
    });

    if (!project) {
      return badRequest("Project not found");
    }

    projectId = project.id;
  }

  try {
    const lastTodo = await db.todo.findFirst({
      where: { date: body.date },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const todo = await db.todo.create({
      data: {
        date: body.date,
        title,
        projectId: projectId ?? null,
        position: (lastTodo?.position ?? -1) + 1,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return json(todo, { status: 201 });
  } catch {
    return serverError();
  }
}
