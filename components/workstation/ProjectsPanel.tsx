"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import { ProjectForm } from "@/components/workstation/ProjectForm";
import { ProjectRow } from "@/components/workstation/ProjectRow";
import { cn } from "@/lib/cn";
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type CreateProjectInput,
  type Project,
} from "@/lib/projects";

interface ProjectsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

type SwipeAction = {
  projectId: string;
  type: "delete" | "edit";
};

export function ProjectsPanel({ index = 0, isOpen, onToggle }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [swipeAction, setSwipeAction] = useState<SwipeAction | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const data = await fetchProjects();
        if (!cancelled) setProjects(data);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      closeForm();
      setExpandedProjectId(null);
      setSwipeAction(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!listRef.current?.contains(target)) {
        setSwipeAction(null);
        return;
      }
      if (target instanceof Element) {
        if (
          target.closest("[data-project-delete]") ||
          target.closest("[data-project-edit]")
        ) {
          return;
        }
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function closeForm() {
    setShowForm(false);
    setEditingProject(null);
  }

  function openCreateForm() {
    setEditingProject(null);
    setShowForm(true);
    setSwipeAction(null);
    setExpandedProjectId(null);
  }

  function openEditForm(project: Project) {
    setEditingProject(project);
    setShowForm(true);
    setSwipeAction(null);
    setExpandedProjectId(null);
  }

  async function handleSave(input: CreateProjectInput) {
    if (editingProject) {
      const updated = await updateProject(editingProject.id, input);
      setProjects((current) =>
        current.map((project) =>
          project.id === updated.id ? updated : project
        )
      );
    } else {
      const project = await createProject(input);
      setProjects((current) => [project, ...current]);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
    setSwipeAction((current) =>
      current?.projectId === id ? null : current
    );
    setExpandedProjectId((current) => (current === id ? null : current));
  }

  const headerAction = (
    <button
      type="button"
      aria-label={showForm ? "Close project form" : "Add project"}
      onClick={() => (showForm ? closeForm() : openCreateForm())}
      className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
    >
      {showForm ? (
        <X size={16} strokeWidth={1.5} />
      ) : (
        <Plus size={16} strokeWidth={1.5} />
      )}
    </button>
  );

  return (
    <AccordionPanel
      label="Projects"
      index={index}
      isOpen={isOpen}
      onToggle={onToggle}
      headerAction={isOpen ? headerAction : undefined}
      scrollContent={!showForm}
    >
      {showForm ? (
        <ProjectForm
          key={editingProject?.id ?? "create"}
          project={editingProject ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
        />
      ) : (
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col">
          {!loading && projects.length > 0 && (
            <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
              {projects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  isExpanded={expandedProjectId === project.id}
                  onToggleExpand={() => {
                    setExpandedProjectId((current) =>
                      current === project.id ? null : project.id
                    );
                    setSwipeAction(null);
                  }}
                  isDeleteRevealed={
                    swipeAction?.projectId === project.id &&
                    swipeAction.type === "delete"
                  }
                  isEditRevealed={
                    swipeAction?.projectId === project.id &&
                    swipeAction.type === "edit"
                  }
                  onRevealDelete={() =>
                    setSwipeAction({ projectId: project.id, type: "delete" })
                  }
                  onRevealEdit={() =>
                    setSwipeAction({ projectId: project.id, type: "edit" })
                  }
                  onCloseActions={() => setSwipeAction(null)}
                  onDelete={handleDelete}
                  onEdit={openEditForm}
                  onInteractionStart={() => {
                    setSwipeAction((current) =>
                      current?.projectId === project.id ? current : null
                    );
                    setExpandedProjectId((current) =>
                      current === project.id ? current : null
                    );
                  }}
                />
              ))}
            </div>
          )}
          {!loading && projects.length === 0 && (
            <div className={cn("flex flex-1 items-center justify-center py-8")} />
          )}
        </div>
      )}
    </AccordionPanel>
  );
}
