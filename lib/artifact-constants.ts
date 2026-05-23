import { db } from "@/lib/db";

export const MISC_THOUGHTS_TITLE = "misc-thoughts";
export const MISC_THOUGHTS_DISPLAY_TITLE = "misc notes";
export const THOUGHTS_JOURNAL_KIND = "thoughts-journal";
export const USER_ARTIFACT_KIND = "txt";
export const SKETCH_ARTIFACT_KIND = "sketch";

export function isUserCreatableArtifact(artifact: {
  isSystem: boolean;
  kind: string;
}) {
  return (
    !artifact.isSystem &&
    (artifact.kind === USER_ARTIFACT_KIND ||
      artifact.kind === SKETCH_ARTIFACT_KIND)
  );
}

// `kind` identifies artifact behavior in the backend (system journals vs user files).
// `getArtifactTypeLabel` maps that to the user-facing type shown in the UI.
export function getArtifactTypeLabel(kind: string): string {
  if (kind === THOUGHTS_JOURNAL_KIND) {
    return USER_ARTIFACT_KIND;
  }

  return kind;
}

export function getProjectThoughtsTitle(projectName: string) {
  return `${projectName}-thoughts`;
}

export function getProjectThoughtsDisplayTitle(projectName: string) {
  return `${projectName} Thoughts`;
}

export function isMiscThoughtsArtifact(artifact: {
  isSystem: boolean;
  title: string;
}) {
  return artifact.isSystem && artifact.title === MISC_THOUGHTS_TITLE;
}

export function isProjectThoughtsJournal(artifact: {
  isSystem: boolean;
  kind: string;
  projectId: string | null;
}) {
  return (
    artifact.isSystem &&
    artifact.kind === THOUGHTS_JOURNAL_KIND &&
    artifact.projectId !== null
  );
}

export function getArtifactDisplayTitle(artifact: {
  title: string;
  isSystem: boolean;
  kind: string;
  projectId: string | null;
  project?: { name: string } | null;
}) {
  if (isMiscThoughtsArtifact(artifact)) {
    return MISC_THOUGHTS_DISPLAY_TITLE;
  }

  if (isProjectThoughtsJournal(artifact) && artifact.project?.name) {
    return getProjectThoughtsDisplayTitle(artifact.project.name);
  }

  return artifact.title;
}

export async function getOrCreateMiscThoughtsArtifact() {
  const existing = await db.artifact.findFirst({
    where: {
      title: MISC_THOUGHTS_TITLE,
      projectId: null,
      isSystem: true,
    },
  });

  if (existing) return existing;

  return db.artifact.create({
    data: {
      title: MISC_THOUGHTS_TITLE,
      kind: THOUGHTS_JOURNAL_KIND,
      projectId: null,
      isSystem: true,
      content: "",
    },
  });
}

export async function getOrCreateProjectThoughtsArtifact(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const existing = await db.artifact.findFirst({
    where: {
      projectId,
      isSystem: true,
      kind: THOUGHTS_JOURNAL_KIND,
    },
  });

  if (existing) return existing;

  return db.artifact.create({
    data: {
      title: getProjectThoughtsTitle(project.name),
      kind: THOUGHTS_JOURNAL_KIND,
      projectId,
      isSystem: true,
      content: "",
    },
  });
}

export function isReservedArtifactTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === MISC_THOUGHTS_TITLE ||
    normalized.endsWith("-thoughts")
  );
}
