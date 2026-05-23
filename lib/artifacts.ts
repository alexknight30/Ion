export interface ArtifactProject {
  id: string;
  name: string;
  color: string | null;
}

export interface ThoughtNote {
  id: string;
  artifactId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  projectId: string | null;
  title: string;
  kind: string;
  content: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  project?: ArtifactProject | null;
  notes?: ThoughtNote[];
}

export interface CreateArtifactInput {
  title: string;
  kind: string;
  projectId: string;
  content?: string;
}

export const ARTIFACT_TYPES = ["txt"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export async function fetchArtifacts(): Promise<Artifact[]> {
  const response = await fetch("/api/artifacts");
  if (!response.ok) {
    throw new Error("Failed to load artifacts");
  }
  return response.json();
}

export async function fetchArtifact(id: string): Promise<Artifact> {
  const response = await fetch(`/api/artifacts/${id}`);
  if (!response.ok) {
    throw new Error("Failed to load artifact");
  }
  return response.json();
}

export async function createArtifact(
  input: CreateArtifactInput
): Promise<Artifact> {
  const response = await fetch("/api/artifacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create artifact");
  }

  return response.json();
}

export async function updateArtifact(
  id: string,
  input: { content?: string; title?: string }
): Promise<Artifact> {
  const response = await fetch(`/api/artifacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update artifact");
  }

  return response.json();
}

export async function deleteArtifact(id: string): Promise<void> {
  const response = await fetch(`/api/artifacts/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete artifact");
  }
}
