import { db } from "@/lib/db";
import { THOUGHTS_JOURNAL_KIND } from "@/lib/artifact-constants";

const RECENT_WORK_ACTIVITY_LIMIT = 20;

function noteActivityTitle(content: string) {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  if (!firstLine) return "Untitled note";
  const trimmed = firstLine.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function buildRecentWorkActivity(
  projects: Array<{ name: string; updatedAt: Date }>,
  artifacts: Array<{
    title: string;
    updatedAt: Date;
    project: { name: string } | null;
  }>,
  notes: Array<{
    content: string;
    updatedAt: Date;
    artifact: {
      title: string;
      kind: string;
      project: { name: string } | null;
    };
  }>
): AvailableContext["recentWorkActivity"] {
  const activity: AvailableContext["recentWorkActivity"] = [
    ...projects.map((project) => ({
      type: "project" as const,
      title: project.name,
      updatedAt: project.updatedAt.toISOString(),
    })),
    ...artifacts.map((artifact) => ({
      type: "artifact" as const,
      title: artifact.title,
      projectName: artifact.project?.name,
      updatedAt: artifact.updatedAt.toISOString(),
    })),
    ...notes.map((note) => {
      const isThoughtJournal = note.artifact.kind === THOUGHTS_JOURNAL_KIND;
      return {
        type: isThoughtJournal ? ("thought" as const) : ("note" as const),
        title: isThoughtJournal
          ? noteActivityTitle(note.content)
          : note.artifact.title,
        projectName: note.artifact.project?.name,
        updatedAt: note.updatedAt.toISOString(),
      };
    }),
  ];

  return activity
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
    .slice(0, RECENT_WORK_ACTIVITY_LIMIT);
}

export type ManualContext = {
  profile: {
    name: string;
    occupation: string;
    company: string;
  };
  pinnedProjects: {
    id: string;
    name: string;
    description?: string;
    workType?: string;
  }[];
  pinnedArtifacts: {
    id: string;
    title: string;
    kind: string;
    contentPreview?: string;
  }[];
};

export type AvailableContext = {
  currentTab: string;
  currentDate: string;
  activeProject: {
    id: string;
    name: string;
    description?: string;
    workType?: string;
  } | null;
  activeArtifact: {
    id: string;
    title: string;
    kind: string;
    contentPreview: string;
  } | null;
  recentProjects: {
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
  }[];
  todosToday: {
    id: string;
    title: string;
    completed: boolean;
    projectName?: string;
    updatedAt: string;
  }[];
  allProjectNames: string[];
  allArtifactTitles: {
    id: string;
    title: string;
    kind: string;
    projectName?: string;
    updatedAt: string;
  }[];
  recentWorkActivity: {
    type: "project" | "artifact" | "thought" | "note";
    title: string;
    projectName?: string;
    updatedAt: string;
  }[];
};

export type MADContext = {
  manual: ManualContext;
  available: AvailableContext;
};

export async function assembleContext(params: {
  currentTab: string;
  currentDate: string;
  activeProjectId?: string | null;
  activeArtifactId?: string | null;
  pinnedProjectIds?: string[];
  pinnedArtifactIds?: string[];
}): Promise<MADContext> {
  const activeProjectId = params.activeProjectId ?? null;
  const activeArtifactId = params.activeArtifactId ?? null;
  const pinnedProjectIds = [...new Set(params.pinnedProjectIds ?? [])];
  const pinnedArtifactIds = [...new Set(params.pinnedArtifactIds ?? [])];

  const [
    profile,
    activeProject,
    activeArtifact,
    pinnedProjects,
    pinnedArtifacts,
    todosToday,
    projects,
    artifacts,
    recentNotes,
  ] = await Promise.all([
    db.profile.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    }),
    activeProjectId
      ? db.project.findUnique({ where: { id: activeProjectId } })
      : Promise.resolve(null),
    activeArtifactId
      ? db.artifact.findUnique({
          where: { id: activeArtifactId },
          include: { project: { select: { name: true } } },
        })
      : Promise.resolve(null),
    pinnedProjectIds.length
      ? db.project.findMany({
          where: { id: { in: pinnedProjectIds } },
          select: {
            id: true,
            name: true,
            description: true,
            workType: true,
          },
        })
      : Promise.resolve([]),
    pinnedArtifactIds.length
      ? db.artifact.findMany({
          where: { id: { in: pinnedArtifactIds } },
          select: {
            id: true,
            title: true,
            kind: true,
            content: true,
          },
        })
      : Promise.resolve([]),
    db.todo.findMany({
      where: { date: params.currentDate },
      orderBy: [{ completed: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      include: { project: { select: { name: true } } },
    }),
    db.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.artifact.findMany({
      select: {
        id: true,
        title: true,
        kind: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.note.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        content: true,
        updatedAt: true,
        artifact: {
          select: {
            title: true,
            kind: true,
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const recentProjects = projects.slice(0, 5).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    updatedAt: project.updatedAt.toISOString(),
  }));

  const recentWorkActivity = buildRecentWorkActivity(
    projects,
    artifacts,
    recentNotes
  );

  return {
    manual: {
      profile: {
        name: profile.name,
        occupation: profile.occupation,
        company: profile.company,
      },
      pinnedProjects: pinnedProjects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description ?? undefined,
        workType: project.workType ?? undefined,
      })),
      pinnedArtifacts: pinnedArtifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        kind: artifact.kind,
        contentPreview: artifact.content
          ? artifact.content.slice(0, 300)
          : undefined,
      })),
    },
    available: {
      currentTab: params.currentTab,
      currentDate: params.currentDate,
      activeProject: activeProject
        ? {
            id: activeProject.id,
            name: activeProject.name,
            description: activeProject.description ?? undefined,
            workType: activeProject.workType ?? undefined,
          }
        : null,
      activeArtifact: activeArtifact
        ? {
            id: activeArtifact.id,
            title: activeArtifact.title,
            kind: activeArtifact.kind,
            contentPreview: (activeArtifact.content ?? "").slice(0, 500),
          }
        : null,
      recentProjects,
      todosToday: todosToday.map((todo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        projectName: todo.project?.name,
        updatedAt: todo.updatedAt.toISOString(),
      })),
      allProjectNames: projects.map((project) => project.name),
      allArtifactTitles: artifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        kind: artifact.kind,
        projectName: artifact.project?.name,
        updatedAt: artifact.updatedAt.toISOString(),
      })),
      recentWorkActivity,
    },
  };
}
