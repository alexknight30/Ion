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
  type CreateProjectInput,
  type Project,
} from "@/lib/projects";

interface ProjectsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function ProjectsPanel({ index = 0, isOpen, onToggle }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealedProjectId, setRevealedProjectId] = useState<string | null>(null);
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
      setShowForm(false);
      setRevealedProjectId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!listRef.current?.contains(target)) {
        setRevealedProjectId(null);
        return;
      }
      if (
        target instanceof Element &&
        target.closest("[data-project-delete]")
      ) {
        return;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function handleSave(input: CreateProjectInput) {
    const project = await createProject(input);
    setProjects((current) => [project, ...current]);
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
    setRevealedProjectId((current) => (current === id ? null : current));
  }

  const headerAction = (
    <button
      type="button"
      aria-label={showForm ? "Close project form" : "Add project"}
      onClick={() => setShowForm((current) => !current)}
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
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col">
          {!loading && projects.length > 0 && (
            <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
              {projects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  isRevealed={revealedProjectId === project.id}
                  onReveal={() => setRevealedProjectId(project.id)}
                  onClose={() => setRevealedProjectId(null)}
                  onDelete={handleDelete}
                  onInteractionStart={() => {
                    setRevealedProjectId((current) =>
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
