import type { Artifact, ThoughtNote } from "@/lib/artifacts";

export interface CreateThoughtResult {
  note: ThoughtNote;
  artifact: Artifact;
}

export async function createThought(
  content: string,
  projectId: string | null
): Promise<CreateThoughtResult> {
  const response = await fetch("/api/thoughts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, projectId }),
  });

  if (!response.ok) {
    throw new Error("Failed to save thought");
  }

  return response.json();
}

export async function updateThought(
  noteId: string,
  content: string
): Promise<ThoughtNote> {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error("Failed to update thought");
  }

  return response.json();
}
