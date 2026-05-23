import { db } from "@/lib/db";
import {
  getOrCreateMiscThoughtsArtifact,
  getOrCreateProjectThoughtsArtifact,
} from "@/lib/artifact-constants";

export async function createThought(content: string, projectId: string | null) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Thought content is required");
  }

  const artifact = projectId
    ? await getOrCreateProjectThoughtsArtifact(projectId)
    : await getOrCreateMiscThoughtsArtifact();

  if (!artifact) {
    throw new Error("Project not found");
  }

  const note = await db.note.create({
    data: {
      artifactId: artifact.id,
      content: trimmed,
    },
  });

  await db.artifact.update({
    where: { id: artifact.id },
    data: { updatedAt: new Date() },
  });

  return { note, artifact };
}
