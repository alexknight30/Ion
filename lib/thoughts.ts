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
