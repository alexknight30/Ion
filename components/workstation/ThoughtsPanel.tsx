"use client";

import { useEffect, useMemo, useState } from "react";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import { ArtifactSelect } from "@/components/workstation/ArtifactSelect";
import { cn } from "@/lib/cn";
import { fetchArtifacts, type Artifact } from "@/lib/artifacts";
import {
  buildThoughtDestinationOptions,
  getProjectIdForOption,
  MISC_THOUGHTS_OPTION_ID,
} from "@/lib/artifact-select-options";
import { fetchProfile, getFirstName } from "@/lib/profile";
import { fetchProjects, type Project } from "@/lib/projects";
import { createThought } from "@/lib/thoughts";

interface ThoughtsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
  onThoughtSaved: (artifactId: string) => void;
  projectsRefreshKey?: number;
  artifactsRefreshKey?: number;
}

export function ThoughtsPanel({
  index = 2,
  isOpen,
  onToggle,
  onThoughtSaved,
  projectsRefreshKey = 0,
  artifactsRefreshKey = 0,
}: ThoughtsPanelProps) {
  const [content, setContent] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState(
    MISC_THOUGHTS_OPTION_ID
  );
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thoughtOptions = useMemo(
    () => buildThoughtDestinationOptions(artifacts, projects),
    [artifacts, projects]
  );

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

    async function loadData() {
      try {
        const [artifactList, projectList] = await Promise.all([
          fetchArtifacts(),
          fetchProjects(),
        ]);

        if (cancelled) return;

        setArtifacts(artifactList);
        setProjects(projectList);
      } catch {
        if (!cancelled) {
          setArtifacts([]);
          setProjects([]);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectsRefreshKey, artifactsRefreshKey]);

  useEffect(() => {
    if (thoughtOptions.length === 0) return;

    setSelectedOptionId((current) =>
      thoughtOptions.some((option) => option.id === current)
        ? current
        : thoughtOptions[0].id
    );
  }, [thoughtOptions]);

  const placeholder = firstName
    ? `What's on your mind ${firstName}?`
    : "What's on your mind?";

  async function handleSave() {
    if (!content.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const projectId = getProjectIdForOption(thoughtOptions, selectedOptionId);
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
            <ArtifactSelect
              options={thoughtOptions}
              value={selectedOptionId}
              onChange={setSelectedOptionId}
              disabled={loading}
              placeholder="Select thought journal"
              emptyLabel="No thought journals"
              ariaLabel="Assign thought to journal"
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
