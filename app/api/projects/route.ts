import { db } from "@/lib/db";
import {
  badRequest,
  json,
  optionalString,
  parseJsonBody,
  requireString,
  serverError,
} from "@/lib/api";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { artifacts: true },
        },
      },
    });

    return json(projects);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody<{
    name?: unknown;
    description?: unknown;
    workType?: unknown;
    color?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const name = requireString(body.name, "name");
  if (name instanceof Response) return name;

  try {
    const project = await db.project.create({
      data: {
        name,
        description: optionalString(body.description),
        workType: optionalString(body.workType),
        color: optionalString(body.color),
      },
    });

    return json(project, { status: 201 });
  } catch {
    return serverError();
  }
}
