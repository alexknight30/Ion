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
import { serializeSketch, createEmptySketchDocument } from "@/lib/sketch";
import {
  getOrCreateMiscThoughtsArtifact,
  isReservedArtifactTitle,
  SKETCH_ARTIFACT_KIND,
  USER_ARTIFACT_KIND,
} from "@/lib/artifact-constants";

const CREATABLE_ARTIFACT_KINDS = new Set([
  USER_ARTIFACT_KIND,
  SKETCH_ARTIFACT_KIND,
]);

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
  if (!CREATABLE_ARTIFACT_KINDS.has(kind)) {
    return badRequest(`Unsupported artifact kind "${kind}"`);
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
        content:
          typeof body.content === "string"
            ? body.content
            : kind === SKETCH_ARTIFACT_KIND
              ? serializeSketch(createEmptySketchDocument())
              : "",
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
