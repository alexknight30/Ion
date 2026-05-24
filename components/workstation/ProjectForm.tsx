"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { SmartInput, SmartTextarea } from "@/components/ui/SmartTextarea";
import {
  PROJECT_COLORS,
  WORK_TYPES,
  type CreateProjectInput,
  type Project,
  type WorkType,
} from "@/lib/projects";

interface ProjectFormProps {
  project?: Project;
  onSave: (input: CreateProjectInput) => Promise<void>;
  onCancel: () => void;
}

function getInitialWorkType(project?: Project): WorkType | null {
  if (project?.workType && WORK_TYPES.includes(project.workType as WorkType)) {
    return project.workType as WorkType;
  }
  return null;
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

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [workType, setWorkType] = useState<WorkType | null>(() =>
    getInitialWorkType(project)
  );
  const [color, setColor] = useState<string>(
    project?.color ?? PROJECT_COLORS[5].value
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: trimmedTitle,
        description: description.trim() || undefined,
        workType: workType ?? undefined,
        color,
      });
      onCancel();
    } catch {
      setError(
        project
          ? "Could not update project. Try again."
          : "Could not save project. Try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-5">
        <div>
          <FieldLabel>Title</FieldLabel>
          <SmartInput
            type="text"
            value={title}
            onChange={setTitle}
            placeholder="Project name"
            className={inputClassName}
            autoFocus
          />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <SmartTextarea
            value={description}
            onChange={setDescription}
            placeholder="What is this project about?"
            rows={2}
            className={cn(inputClassName, "resize-none leading-[1.5]")}
          />
        </div>

        <div>
          <FieldLabel>Work type</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map((type) => {
              const selected = workType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWorkType(selected ? null : type)}
                  className={cn(
                    "rounded-[9999px] border px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition-[border-color,background-color,color] duration-200",
                    selected
                      ? "border-[var(--color-border-active)] bg-[var(--color-ash)] text-[var(--color-glacier)]"
                      : "border-[var(--color-border-subtle)] text-[var(--color-steam)] hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Color</FieldLabel>
          {error && (
            <span className="mb-2 block text-[13px] text-[var(--color-ember)]">
              {error}
            </span>
          )}
          <div className="grid grid-cols-[repeat(8,1.75rem)] gap-x-2.5 gap-y-2.5">
            {PROJECT_COLORS.slice(0, 8).map((option) => {
              const selected = color === option.value;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`Select ${option.id}`}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-200",
                    selected && "scale-110"
                  )}
                >
                  <span
                    className={cn(
                      "h-6 w-6 rounded-full ring-offset-2 ring-offset-[var(--color-obsidian)] transition-[box-shadow] duration-200",
                      selected && "ring-2 ring-[var(--color-border-active)]"
                    )}
                    style={{ backgroundColor: option.value }}
                  />
                </button>
              );
            })}
            {PROJECT_COLORS.slice(8).map((option) => {
              const selected = color === option.value;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`Select ${option.id}`}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-200",
                    selected && "scale-110"
                  )}
                >
                  <span
                    className={cn(
                      "h-6 w-6 rounded-full ring-offset-2 ring-offset-[var(--color-obsidian)] transition-[box-shadow] duration-200",
                      selected && "ring-2 ring-[var(--color-border-active)]"
                    )}
                    style={{ backgroundColor: option.value }}
                  />
                </button>
              );
            })}
            <button
              type="submit"
              disabled={saving}
              className="col-start-8 row-start-2 justify-self-end rounded-[8px] bg-[var(--color-frost)] px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-[background-color,opacity] duration-200 hover:bg-[var(--color-ash)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
