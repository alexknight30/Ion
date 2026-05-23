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
import {
  getOrCreateMiscThoughtsArtifact,
  isReservedArtifactTitle,
  USER_ARTIFACT_KIND,
} from "@/lib/artifact-constants";

export async function GET() {
  try {
    await getOrCreateMiscThoughtsArtifact();

    const artifacts = await db.artifact.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return json(artifacts);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody<{
    title?: unknown;
    kind?: unknown;
    projectId?: unknown;
    content?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const title = requireString(body.title, "title");
  if (title instanceof Response) return title;

  const projectId = requireString(body.projectId, "projectId");
  if (projectId instanceof Response) return projectId;

  const kind = optionalString(body.kind) ?? USER_ARTIFACT_KIND;
  if (kind !== USER_ARTIFACT_KIND) {
    return badRequest(`Only "${USER_ARTIFACT_KIND}" artifacts can be created currently`);
  }

  if (isReservedArtifactTitle(title)) {
    return badRequest("That artifact title is reserved");
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) return notFound("Project not found");

    const artifact = await db.artifact.create({
      data: {
        title,
        kind,
        projectId,
        content: typeof body.content === "string" ? body.content : "",
        isSystem: false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return json(artifact, { status: 201 });
  } catch {
    return serverError();
  }
}
