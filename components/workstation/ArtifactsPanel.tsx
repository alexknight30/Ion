"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import { ArtifactForm } from "@/components/workstation/ArtifactForm";
import { ArtifactRow } from "@/components/workstation/ArtifactRow";
import { cn } from "@/lib/cn";
import {
  createArtifact,
  fetchArtifacts,
  type Artifact,
  type CreateArtifactInput,
} from "@/lib/artifacts";
import { MISC_THOUGHTS_TITLE, THOUGHTS_JOURNAL_KIND } from "@/lib/artifact-constants";
import { fetchProjects, type Project } from "@/lib/projects";

interface ArtifactsPanelProps {
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
  onOpenArtifact: (artifactId: string) => void;
  refreshKey?: number;
  projectsRefreshKey?: number;
}

export function ArtifactsPanel({
  index = 1,
  isOpen,
  onToggle,
  onOpenArtifact,
  refreshKey = 0,
  projectsRefreshKey = 0,
}: ArtifactsPanelProps) {
  const [miscThoughts, setMiscThoughts] = useState<Artifact | null>(null);
  const [projectThoughtJournals, setProjectThoughtJournals] = useState<Artifact[]>(
    []
  );
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [artifactList, projectList] = await Promise.all([
          fetchArtifacts(),
          fetchProjects(),
        ]);

        if (cancelled) return;

        setAllArtifacts(artifactList);
        setMiscThoughts(
          artifactList.find(
            (artifact) =>
              artifact.isSystem && artifact.title === MISC_THOUGHTS_TITLE
          ) ?? null
        );
        setProjectThoughtJournals(
          artifactList
            .filter(
              (artifact) =>
                artifact.isSystem &&
                artifact.kind === THOUGHTS_JOURNAL_KIND &&
                artifact.projectId
            )
            .sort((left, right) =>
              (left.project?.name ?? "").localeCompare(
                right.project?.name ?? "",
                undefined,
                { sensitivity: "base" }
              )
            )
        );
        setArtifacts(artifactList.filter((artifact) => !artifact.isSystem));
        setProjects(projectList);
      } catch {
        if (!cancelled) {
          setMiscThoughts(null);
          setProjectThoughtJournals([]);
          setArtifacts([]);
          setAllArtifacts([]);
          setProjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, projectsRefreshKey]);

  useEffect(() => {
    if (!isOpen) setShowForm(false);
  }, [isOpen]);

  async function handleSave(input: CreateArtifactInput) {
    const artifact = await createArtifact(input);
    setArtifacts((current) => [artifact, ...current]);
    setShowForm(false);
    onOpenArtifact(artifact.id);
  }

  const headerAction = (
    <button
      type="button"
      aria-label={showForm ? "Close artifact form" : "Add artifact"}
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
      label="Artifacts"
      index={index}
      isOpen={isOpen}
      onToggle={onToggle}
      headerAction={isOpen ? headerAction : undefined}
      scrollContent={!showForm}
    >
      {showForm ? (
        <ArtifactForm
          artifacts={allArtifacts}
          projects={projects}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {!loading &&
            (miscThoughts ||
              projectThoughtJournals.length > 0 ||
              artifacts.length > 0) && (
            <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
              {miscThoughts && (
                <ArtifactRow
                  key={miscThoughts.id}
                  artifact={miscThoughts}
                  onOpen={onOpenArtifact}
                />
              )}
              {projectThoughtJournals.map((artifact) => (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={onOpenArtifact}
                />
              ))}
              {artifacts.map((artifact) => (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={onOpenArtifact}
                />
              ))}
            </div>
          )}
          {!loading &&
            !miscThoughts &&
            projectThoughtJournals.length === 0 &&
            artifacts.length === 0 && (
            <div className={cn("flex flex-1 items-center justify-center py-8")} />
          )}
        </div>
      )}
    </AccordionPanel>
  );
}
