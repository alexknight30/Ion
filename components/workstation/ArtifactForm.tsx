"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ArtifactSelect } from "@/components/workstation/ArtifactSelect";
import {
  ARTIFACT_TYPES,
  type Artifact,
  type ArtifactType,
  type CreateArtifactInput,
} from "@/lib/artifacts";
import {
  buildArtifactParentOptions,
  getProjectIdForOption,
} from "@/lib/artifact-select-options";
import type { Project } from "@/lib/projects";

interface ArtifactFormProps {
  artifacts: Artifact[];
  projects: Project[];
  onSave: (input: CreateArtifactInput) => Promise<void>;
  onCancel: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]">
      {children}
    </span>
  );
}

const inputClassName =
  "w-full rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-3 py-2 text-[14px] text-[var(--color-bone)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--color-pumice)] focus:border-[var(--color-border-active)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]";

export function ArtifactForm({
  artifacts,
  projects,
  onSave,
  onCancel,
}: ArtifactFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ArtifactType>("txt");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => buildArtifactParentOptions(artifacts, projects),
    [artifacts, projects]
  );

  useEffect(() => {
    if (parentOptions.length === 0) return;

    setSelectedOptionId((current) =>
      parentOptions.some((option) => option.id === current)
        ? current
        : parentOptions[0].id
    );
  }, [parentOptions]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    const projectId = getProjectIdForOption(parentOptions, selectedOptionId);
    if (!projectId) {
      setError("Project is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        kind: type,
        projectId,
        content: "",
      });
      onCancel();
    } catch {
      setError("Could not save artifact. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Artifact name"
          className={inputClassName}
          autoFocus
        />
      </div>

      <div>
        <FieldLabel>Type</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ARTIFACT_TYPES.map((option) => {
            const selected = type === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={cn(
                  "rounded-[9999px] border px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition-[border-color,background-color,color] duration-200",
                  selected
                    ? "border-[var(--color-border-active)] bg-[var(--color-ash)] text-[var(--color-glacier)]"
                    : "border-[var(--color-border-subtle)] text-[var(--color-steam)] hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel>Project</FieldLabel>
        {error && (
          <span className="mb-2 block text-[13px] text-[var(--color-ember)]">
            {error}
          </span>
        )}
        <div className="flex items-center gap-2">
          <ArtifactSelect
            options={parentOptions}
            value={selectedOptionId}
            onChange={setSelectedOptionId}
            disabled={parentOptions.length === 0}
            placeholder="Select project artifact"
            emptyLabel="No projects"
            dropdownDirection="down"
            ariaLabel="Assign artifact to project"
          />
          <button
            type="submit"
            disabled={saving || parentOptions.length === 0}
            className="shrink-0 rounded-[8px] bg-[var(--color-frost)] px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-[background-color,opacity] duration-200 hover:bg-[var(--color-ash)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
