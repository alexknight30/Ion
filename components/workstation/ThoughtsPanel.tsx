"use client";

import { useEffect, useState } from "react";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import {
  NO_PROJECT_VALUE,
  ProjectSelect,
} from "@/components/workstation/ProjectSelect";
import { cn } from "@/lib/cn";
import { fetchProfile, getFirstName } from "@/lib/profile";
import { fetchProjects, type Project } from "@/lib/projects";
import { createThought } from "@/lib/thoughts";

interface ThoughtsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
  onThoughtSaved: (artifactId: string) => void;
  projectsRefreshKey?: number;
}

export function ThoughtsPanel({
  index = 2,
  isOpen,
  onToggle,
  onThoughtSaved,
  projectsRefreshKey = 0,
}: ThoughtsPanelProps) {
  const [content, setContent] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(NO_PROJECT_VALUE);
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await fetchProfile();
        if (!cancelled) setFirstName(getFirstName(profile.name));
      } catch {
        // Keep default placeholder if profile fails to load.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadProjects() {
      try {
        const projectList = await fetchProjects();
        if (!cancelled) setProjects(projectList);
      } catch {
        if (!cancelled) setProjects([]);
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectsRefreshKey]);

  const placeholder = firstName
    ? `What's on your mind ${firstName}?`
    : "What's on your mind?";

  async function handleSave() {
    if (!content.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const projectId =
        selectedProjectId === NO_PROJECT_VALUE ? null : selectedProjectId;
      const result = await createThought(content, projectId);
      setContent("");
      onThoughtSaved(result.artifact.id);
    } catch {
      setError("Could not save thought. Try again.");
    } finally {
      setSaving(false);
    }
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

        <div className="mt-4 flex shrink-0 flex-col gap-2">
          {error && (
            <span className="text-[13px] text-[var(--color-ember)]">{error}</span>
          )}
          <div className="flex items-center gap-2">
            <ProjectSelect
              projects={projects}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              disabled={loading}
              showNoProject
              noProjectLabel="No project"
              ariaLabel="Assign thought to project"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !content.trim()}
              className="shrink-0 rounded-[8px] bg-[var(--color-frost)] px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-[background-color,opacity] duration-200 hover:bg-[var(--color-ash)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </AccordionPanel>
  );
}
