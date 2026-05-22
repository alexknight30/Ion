export const WORK_TYPES = [
  "Coding",
  "Writing",
  "Design",
  "Research",
  "Planning",
  "Analysis",
  "Learning",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const PROJECT_COLORS = [
  { id: "red", value: "#FF3B30" },
  { id: "orange", value: "#FF9500" },
  { id: "yellow", value: "#FFCC00" },
  { id: "green", value: "#34C759" },
  { id: "teal", value: "#5AC8FA" },
  { id: "blue", value: "#007AFF" },
  { id: "indigo", value: "#5856D6" },
  { id: "purple", value: "#AF52DE" },
  { id: "pink", value: "#FF2D55" },
  { id: "brown", value: "#A2845E" },
  { id: "gray", value: "#8E8E93" },
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number]["value"];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  workType: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  workType?: string;
  color?: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error("Failed to load projects");
  }
  return response.json();
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create project");
  }

  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete project");
  }
}
