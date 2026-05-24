import type { MADContext } from "@/lib/context";

function formatActiveProject(
  project: MADContext["available"]["activeProject"]
) {
  if (!project) return "none";
  const parts = [project.name];
  if (project.workType) parts.push(`(${project.workType})`);
  if (project.description) parts.push(`— ${project.description}`);
  return parts.join(" ");
}

function formatActiveArtifact(
  artifact: MADContext["available"]["activeArtifact"]
) {
  if (!artifact) return "none";
  return `${artifact.title} (${artifact.kind})${
    artifact.contentPreview
      ? `\nPreview: ${artifact.contentPreview.slice(0, 200)}${
          artifact.contentPreview.length > 200 ? "…" : ""
        }`
      : ""
  }`;
}

function formatTodos(todos: MADContext["available"]["todosToday"]) {
  if (todos.length === 0) return "none";
  return todos
    .map((todo) => {
      const status = todo.completed ? "[done]" : "[open]";
      const project = todo.projectName ? ` (${todo.projectName})` : "";
      return `- ${status} ${todo.title}${project}`;
    })
    .join("\n");
}

function formatProjects(names: string[]) {
  if (names.length === 0) return "none";
  return names.join(", ");
}

function formatArtifacts(
  artifacts: MADContext["available"]["allArtifactTitles"]
) {
  if (artifacts.length === 0) return "none";
  return artifacts
    .map((artifact) => {
      const project = artifact.projectName ? ` · ${artifact.projectName}` : "";
      return `- ${artifact.title} (${artifact.kind})${project}`;
    })
    .join("\n");
}

export function buildSystemPrompt(ctx: MADContext): string {
  const { manual, available } = ctx;
  const userLine = [manual.profile.name, manual.profile.occupation]
    .filter(Boolean)
    .join(", ");
  const companyLine = manual.profile.company
    ? ` at ${manual.profile.company}`
    : "";

  return `You are Ion — a personal AI workstation assistant for one user. You know their projects, artifacts, todos, and thoughts. You help them think, plan, and work inside Ion.

## The MAD context contract

Every turn you receive structured context in three layers:

**M — Manual context (privileged, user-defined ground truth)**
Facts the user has set explicitly. Treat these as always true.

**A — Available context (deterministic workstation state)**
What tab they are on, today's date, what is open, and lightweight indexes of what exists in Ion right now. Use this to narrow what is relevant.

**D — Discernable context (your job)**
Before answering, identify:
1. Which specific items from A (projects, artifacts, todos) are relevant to the user's message
2. The time scale (today, this week, a specific project, all-time)

You do not have tools yet — reason only from M and A. When helpful, briefly state what you are focusing on (e.g. "Based on your active project X and today's todos…"). Do not invent items that are not listed in A.

## Tone and behavior

- Concise, direct, and personal. Address the user by name when natural.
- Not sycophantic. No filler praise.
- If you lack enough context to answer confidently, ask one specific clarifying question instead of guessing.

--- MANUAL CONTEXT (M) ---
User: ${userLine || "Unknown user"}${companyLine}

--- AVAILABLE CONTEXT (A) ---
Current tab: ${available.currentTab}
Date: ${available.currentDate}
Active project: ${formatActiveProject(available.activeProject)}
Active artifact: ${formatActiveArtifact(available.activeArtifact)}
Recent projects: ${
    available.recentProjects.length > 0
      ? available.recentProjects.map((project) => project.name).join(", ")
      : "none"
  }
Today's todos:
${formatTodos(available.todosToday)}
All projects: ${formatProjects(available.allProjectNames)}
All artifacts:
${formatArtifacts(available.allArtifactTitles)}`;
}
