import type { MADContext } from "@/lib/context";

export type ConversationHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export const CONVERSATION_HISTORY_LIMIT = 10;
export const ION_TITLE_PATTERN =
  /^\[ION_TITLE\]([\s\S]*?)\[\/ION_TITLE\]\n?\n?/;

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

function formatPinnedProjects(
  projects: MADContext["manual"]["pinnedProjects"]
) {
  if (projects.length === 0) return "none";
  return projects
    .map((project) => {
      const parts = [project.name];
      if (project.workType) parts.push(`(${project.workType})`);
      if (project.description) parts.push(`— ${project.description}`);
      return `- ${parts.join(" ")}`;
    })
    .join("\n");
}

function formatPinnedArtifacts(
  artifacts: MADContext["manual"]["pinnedArtifacts"]
) {
  if (artifacts.length === 0) return "none";
  return artifacts
    .map((artifact) => {
      const preview = artifact.contentPreview
        ? `\n  Preview: ${artifact.contentPreview.slice(0, 150)}${
            artifact.contentPreview.length > 150 ? "…" : ""
          }`
        : "";
      return `- ${artifact.title} (${artifact.kind})${preview}`;
    })
    .join("\n");
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

function formatActivityTimestamp(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRecentWorkActivity(
  activity: MADContext["available"]["recentWorkActivity"]
) {
  if (activity.length === 0) return "none";
  return activity
    .map((entry) => {
      const project = entry.projectName ? ` · ${entry.projectName}` : "";
      return `- [${entry.type}] ${entry.title}${project} — updated ${formatActivityTimestamp(entry.updatedAt)}`;
    })
    .join("\n");
}

function formatArtifacts(
  artifacts: MADContext["available"]["allArtifactTitles"]
) {
  if (artifacts.length === 0) return "none";
  return artifacts
    .map((artifact) => {
      const project = artifact.projectName ? ` · ${artifact.projectName}` : "";
      return `- ${artifact.title} (${artifact.kind})${project} — updated ${formatActivityTimestamp(artifact.updatedAt)}`;
    })
    .join("\n");
}

function formatConversationHistory(
  history: ConversationHistoryMessage[] | undefined
) {
  if (!history?.length) return "";

  return `

--- CONVERSATION HISTORY (last ${history.length} messages) ---
Use this to continue naturally if the user is picking up an earlier thread.

${history
  .map((entry) => {
    const label = entry.role === "user" ? "User" : "Assistant";
    return `${label}: ${entry.content}`;
  })
  .join("\n\n")}`;
}

function formatFirstMessageDuty(isFirstMessage: boolean) {
  if (!isFirstMessage) return "";

  return `

## First message duty
This is the first message in a new conversation. Begin your reply with exactly one line in this format:
[ION_TITLE]Short descriptive title[/ION_TITLE]
Then leave a blank line, then write your actual reply. The title should be 3-6 words summarizing the user's intent. Do not mention the title format in your reply.`;
}

export function buildSystemPrompt(
  ctx: MADContext,
  conversationHistory?: ConversationHistoryMessage[],
  options?: { isFirstMessage?: boolean }
): string {
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
- Profile basics come from Settings (name, role, company).
- Pinned projects/artifacts come from what the user attached in the chat box for this message — treat these as intentionally elevated context.

**A — Available context (deterministic workstation state)**
What tab they are on, today's date, what is open, lightweight indexes of what exists in Ion, and recent work timestamps (project/artifact/thought updates). Use timestamps to reason about activity — do not infer recency from counts alone.

**D — Discernable context (your job)**
Before answering, identify:
1. Which specific items from A (projects, artifacts, todos) are relevant to the user's message
2. The time scale (today, this week, a specific project, all-time)

You do not have tools yet — reason only from M and A. When helpful, briefly state what you are focusing on (e.g. "Based on your pinned Ion project and today's todos…"). Do not invent items that are not listed in M or A.

## Tone and behavior

- Concise, direct, and personal. Address the user by name when natural.
- Not sycophantic. No filler praise.
- If you lack enough context to answer confidently, ask one specific clarifying question instead of guessing.${formatFirstMessageDuty(options?.isFirstMessage ?? false)}

## Ion tabs (where features live)

- Organize: calendar, inbox, and the daily todo list (view, add, complete, and reorder todos for the selected date)
- Work: projects, artifacts, thought journals, and whiteboard documents
- Chat: full conversations with optional pinned project/artifact context
- Settings: profile, agent configuration, integrations, and usage

Current tab: ${available.currentTab}
Only recommend actions the user can take on their current tab. Todos are created and managed only on the Organize tab — never suggest adding todos while the user is on Work, Chat, or Settings. If todos are relevant, tell them to switch to Organize or reference today's list as read-only context below.

--- MANUAL CONTEXT (M) ---
User profile: ${userLine || "Unknown user"}${companyLine}

Pinned projects (attached in chat):
${formatPinnedProjects(manual.pinnedProjects)}

Pinned artifacts (attached in chat):
${formatPinnedArtifacts(manual.pinnedArtifacts)}

--- AVAILABLE CONTEXT (A) ---
Current tab: ${available.currentTab}
Date: ${available.currentDate}
Active project: ${formatActiveProject(available.activeProject)}
Active artifact: ${formatActiveArtifact(available.activeArtifact)}
Recent projects: ${
    available.recentProjects.length > 0
      ? available.recentProjects
          .map(
            (project) =>
              `${project.name} (updated ${formatActivityTimestamp(project.updatedAt)})`
          )
          .join(", ")
      : "none"
  }
Today's todos (Organize tab only — read-only reference here):
${formatTodos(available.todosToday)}
Recent work activity (newest first):
${formatRecentWorkActivity(available.recentWorkActivity)}
All projects: ${formatProjects(available.allProjectNames)}
All artifacts:
${formatArtifacts(available.allArtifactTitles)}${formatConversationHistory(conversationHistory)}`;
}

export function getRecentConversationHistory<
  T extends ConversationHistoryMessage,
>(messages: T[], limit = CONVERSATION_HISTORY_LIMIT) {
  return messages.slice(-limit);
}

export function extractConversationTitle(reply: string) {
  const match = reply.match(ION_TITLE_PATTERN);
  if (!match) {
    return { title: null as string | null, content: reply.trim() };
  }

  const title = match[1].trim().slice(0, 80);
  const content = reply.slice(match[0].length).trim();

  return {
    title: title.length > 0 ? title : null,
    content: content.length > 0 ? content : reply.trim(),
  };
}

export function createTitleStreamFilter() {
  let buffer = "";
  let pastTitle = false;

  return (delta: string) => {
    if (pastTitle) return delta;

    buffer += delta;

    const match = buffer.match(ION_TITLE_PATTERN);
    if (match) {
      pastTitle = true;
      const remainder = buffer.slice(match[0].length);
      buffer = "";
      return remainder;
    }

    if (buffer.length > 120 && !buffer.startsWith("[ION_TITLE]")) {
      pastTitle = true;
      const remainder = buffer;
      buffer = "";
      return remainder;
    }

    return "";
  };
}

export function peekConversationTitle(reply: string) {
  const match = reply.match(ION_TITLE_PATTERN);
  return match?.[1]?.trim().slice(0, 80) ?? null;
}
