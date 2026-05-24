import { db } from "@/lib/db";

export type ManualContext = {
  profile: {
    name: string;
    occupation: string;
    company: string;
  };
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
  }[];
  todosToday: {
    id: string;
    title: string;
    completed: boolean;
    projectName?: string;
  }[];
  allProjectNames: string[];
  allArtifactTitles: {
    id: string;
    title: string;
    kind: string;
    projectName?: string;
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
}): Promise<MADContext> {
  const activeProjectId = params.activeProjectId ?? null;
  const activeArtifactId = params.activeArtifactId ?? null;

  const [
    profile,
    activeProject,
    activeArtifact,
    todosToday,
    projects,
    artifacts,
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
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const recentProjects = projects.slice(0, 5).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
  }));

  return {
    manual: {
      profile: {
        name: profile.name,
        occupation: profile.occupation,
        company: profile.company,
      },
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
      })),
      allProjectNames: projects.map((project) => project.name),
      allArtifactTitles: artifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        kind: artifact.kind,
        projectName: artifact.project?.name,
      })),
    },
  };
}
