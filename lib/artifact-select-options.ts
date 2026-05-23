import type { Artifact } from "@/lib/artifacts";
import type { Project } from "@/lib/projects";
import {
  getArtifactDisplayTitle,
  getProjectThoughtsDisplayTitle,
  isMiscThoughtsArtifact,
  isProjectThoughtsJournal,
  USER_ARTIFACT_KIND,
} from "@/lib/artifact-constants";

export const MISC_THOUGHTS_OPTION_ID = "__misc__";

export interface ArtifactSelectOption {
  id: string;
  label: string;
  subtitle: string;
  color: string | null;
  projectId: string | null;
}

function sortByProjectThenLabel(
  left: ArtifactSelectOption,
  right: ArtifactSelectOption
) {
  const projectCompare = (left.subtitle.split(" · ")[0] ?? "").localeCompare(
    right.subtitle.split(" · ")[0] ?? "",
    undefined,
    { sensitivity: "base" }
  );
  if (projectCompare !== 0) return projectCompare;
  return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
}

export function buildThoughtDestinationOptions(
  artifacts: Artifact[],
  projects: Project[]
): ArtifactSelectOption[] {
  const options: ArtifactSelectOption[] = [];
  const misc = artifacts.find(isMiscThoughtsArtifact);

  if (misc) {
    options.push({
      id: MISC_THOUGHTS_OPTION_ID,
      label: getArtifactDisplayTitle(misc),
      subtitle: "Unassigned · Thought journal",
      color: null,
      projectId: null,
    });
  }

  const journalProjectIds = new Set<string>();

  for (const journal of artifacts.filter(isProjectThoughtsJournal)) {
    if (!journal.projectId) continue;

    journalProjectIds.add(journal.projectId);
    options.push({
      id: journal.projectId,
      label: getArtifactDisplayTitle(journal),
      subtitle: `${journal.project?.name ?? "Project"} · Thought journal`,
      color: journal.project?.color ?? null,
      projectId: journal.projectId,
    });
  }

  for (const project of projects) {
    if (journalProjectIds.has(project.id)) continue;

    options.push({
      id: project.id,
      label: getProjectThoughtsDisplayTitle(project.name),
      subtitle: `${project.name} · Thought journal`,
      color: project.color,
      projectId: project.id,
    });
  }

  return options.sort((left, right) => {
    if (left.id === MISC_THOUGHTS_OPTION_ID) return -1;
    if (right.id === MISC_THOUGHTS_OPTION_ID) return 1;
    return sortByProjectThenLabel(left, right);
  });
}

export function buildArtifactParentOptions(
  artifacts: Artifact[],
  projects: Project[]
): ArtifactSelectOption[] {
  const options: ArtifactSelectOption[] = [];
  const coveredProjectIds = new Set<string>();

  const assignableArtifacts = artifacts.filter(
    (artifact) =>
      artifact.projectId &&
      (isProjectThoughtsJournal(artifact) ||
        (!artifact.isSystem && artifact.kind === USER_ARTIFACT_KIND))
  );

  for (const artifact of assignableArtifacts) {
    if (!artifact.projectId) continue;

    coveredProjectIds.add(artifact.projectId);
    options.push({
      id: artifact.id,
      label: getArtifactDisplayTitle(artifact),
      subtitle: isProjectThoughtsJournal(artifact)
        ? `${artifact.project?.name ?? "Project"} · Thought journal`
        : `${artifact.project?.name ?? "Project"} · ${artifact.kind}`,
      color: artifact.project?.color ?? null,
      projectId: artifact.projectId,
    });
  }

  for (const project of projects) {
    if (coveredProjectIds.has(project.id)) continue;

    options.push({
      id: `project:${project.id}`,
      label: getProjectThoughtsDisplayTitle(project.name),
      subtitle: `${project.name} · No artifacts yet`,
      color: project.color,
      projectId: project.id,
    });
  }

  return options.sort(sortByProjectThenLabel);
}

export function getProjectIdForOption(
  options: ArtifactSelectOption[],
  optionId: string
): string | null {
  return options.find((option) => option.id === optionId)?.projectId ?? null;
}

export function getProjectUserArtifacts(
  artifacts: Artifact[],
  projectId: string
) {
  return artifacts.filter(
    (artifact) =>
      artifact.projectId === projectId &&
      !artifact.isSystem &&
      artifact.kind === USER_ARTIFACT_KIND
  );
}

export function getProjectListArtifacts(
  artifacts: Artifact[],
  projectId: string
) {
  const thoughtJournal = getProjectThoughtJournal(artifacts, projectId);
  const userArtifacts = getProjectUserArtifacts(artifacts, projectId);

  return [
    ...(thoughtJournal ? [thoughtJournal] : []),
    ...userArtifacts,
  ];
}

export function getProjectThoughtJournal(
  artifacts: Artifact[],
  projectId: string
) {
  return (
    artifacts.find(
      (artifact) =>
        isProjectThoughtsJournal(artifact) && artifact.projectId === projectId
    ) ?? null
  );
}
