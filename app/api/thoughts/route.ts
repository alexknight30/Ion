import { json, notFound, parseJsonBody, requireString, serverError } from "@/lib/api";
import { createThought } from "@/lib/thought-service";

export async function POST(request: Request) {
  const body = await parseJsonBody<{
    content?: unknown;
    projectId?: unknown;
  }>(request);

  if (body instanceof Response) return body;

  const content = requireString(body.content, "content");
  if (content instanceof Response) return content;

  const projectId =
    body.projectId === null || body.projectId === undefined
      ? null
      : requireString(body.projectId, "projectId");

  if (projectId instanceof Response) return projectId;

  try {
    const result = await createThought(content, projectId);
    return json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return notFound("Project not found");
    }
    return serverError();
  }
}
