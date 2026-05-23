"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import { cn } from "@/lib/cn";
import { fetchProfile, getFirstName } from "@/lib/profile";
import { fetchProjects, type Project } from "@/lib/projects";

interface ThoughtsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
}

function ProjectColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="h-3 w-3 shrink-0" aria-hidden />;

  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function ProjectSelect({
  projects,
  value,
  onChange,
  disabled = false,
}: ProjectSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((project) => project.id === value);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Add thought to project"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-3 py-2 text-left outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-border-active)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-50",
          !selectedProject && "text-[var(--color-pumice)]"
        )}
      >
        <span className="min-w-0 truncate text-[13px] text-[var(--color-bone)]">
          {selectedProject?.name ?? "No projects"}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <ProjectColorDot color={selectedProject?.color ?? null} />
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={cn(
              "text-[var(--color-pumice)] transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </span>
      </button>

      {open && projects.length > 0 && (
        <ul
          role="listbox"
          aria-label="Projects"
          className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-20 overflow-hidden rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]"
        >
          {projects.map((project) => {
            const selected = project.id === value;
            return (
              <li key={project.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]",
                    selected && "bg-[var(--color-ash)]"
                  )}
                >
                  <span className="min-w-0 truncate text-[13px] tracking-[-0.01em] text-[var(--color-bone)]">
                    {project.name}
                  </span>
                  <ProjectColorDot color={project.color} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ThoughtsPanel({ index = 2, isOpen, onToggle }: ThoughtsPanelProps) {
  const [content, setContent] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, projectList] = await Promise.all([
          fetchProfile(),
          fetchProjects(),
        ]);

        if (cancelled) return;

        setFirstName(getFirstName(profile.name));
        setProjects(projectList);
        setSelectedProjectId(projectList[0]?.id ?? "");
      } catch {
        if (!cancelled) {
          setProjects([]);
          setSelectedProjectId("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const placeholder = firstName
    ? `What's on your mind ${firstName}?`
    : "What's on your mind?";

  function handleSave() {
    if (!content.trim()) return;
    // TODO: wire up thought persistence
  }

  return (
    <AccordionPanel
      label="Thoughts"
      index={index}
      isOpen={isOpen}
      onToggle={onToggle}
      expandSize="limited"
      scrollContent={false}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={loading ? "Loading…" : placeholder}
          disabled={loading}
          className={cn(
            "min-h-0 flex-1 resize-none bg-transparent text-[14px] leading-[1.5] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]",
            loading && "cursor-wait opacity-60"
          )}
        />

        <div className="mt-4 flex shrink-0 items-center gap-2">
          <ProjectSelect
            projects={projects}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            disabled={loading || projects.length === 0}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !content.trim() || !selectedProjectId}
            className="shrink-0 rounded-[8px] bg-[var(--color-frost)] px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-[background-color,opacity] duration-200 hover:bg-[var(--color-ash)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </AccordionPanel>
  );
}
