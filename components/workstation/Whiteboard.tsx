"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import {
  getArtifactDisplayTitle,
  getArtifactTypeLabel,
  THOUGHTS_JOURNAL_KIND,
} from "@/lib/artifact-constants";
import {
  fetchArtifact,
  updateArtifact,
  type Artifact,
  type ArtifactProject,
  type ThoughtNote,
} from "@/lib/artifacts";
import { formatThoughtTimestamp, wasThoughtEdited } from "@/lib/format";
import { updateThought } from "@/lib/thoughts";

interface WhiteboardProps {
  artifactId: string | null;
  refreshKey?: number;
  onClose: () => void;
  index?: number;
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-[13px] text-[var(--color-pumice)]">
        Nothing here yet
      </span>
    </div>
  );
}

function ArtifactTypeBadge({ kind }: { kind: string }) {
  return (
    <span className="shrink-0 rounded-[9999px] border border-[var(--color-border-subtle)] bg-[var(--color-ash)] px-2.5 py-1 text-[12px] font-medium tracking-[-0.01em] text-[var(--color-steam)]">
      {kind}
    </span>
  );
}

function ArtifactProjectBadge({
  project,
}: {
  project: ArtifactProject | null | undefined;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]">
      <span className="truncate">{project?.name ?? "Unassigned"}</span>
      {project?.color ? (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

function ThoughtEntry({
  note,
  onUpdate,
}: {
  note: ThoughtNote;
  onUpdate: (noteId: string, content: string) => Promise<ThoughtNote>;
}) {
  const [content, setContent] = useState(note.content);
  const [displayNote, setDisplayNote] = useState(note);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function adjustHeight() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  useEffect(() => {
    setContent(note.content);
    setDisplayNote(note);
    lastSavedContent.current = note.content;
  }, [note.id]);

  useEffect(() => {
    adjustHeight();
  }, [content]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  async function persist(value: string) {
    if (value === lastSavedContent.current) return;

    try {
      const updated = await onUpdate(note.id, value);
      lastSavedContent.current = updated.content;
      setDisplayNote(updated);
    } catch {
      // Parent surfaces save errors.
    }
  }

  function handleChange(value: string) {
    setContent(value);

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      void persist(value);
    }, 500);
  }

  function handleBlur() {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }

    void persist(content);
  }

  return (
    <article className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]">
          [{formatThoughtTimestamp(displayNote.createdAt)}]
        </h3>
        {wasThoughtEdited(displayNote) ? (
          <span className="text-[12px] font-medium tracking-[-0.01em] text-[var(--color-steam)]">
            [Edited {formatThoughtTimestamp(displayNote.updatedAt)}]
          </span>
        ) : null}
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        rows={1}
        className="w-full resize-none overflow-hidden bg-transparent text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
      />
    </article>
  );
}

function ThoughtJournalView({
  notes,
  onNoteUpdate,
}: {
  notes: ThoughtNote[];
  onNoteUpdate: (noteId: string, content: string) => Promise<ThoughtNote>;
}) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-[13px] text-[var(--color-pumice)]">
          No thoughts yet
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
      {notes.map((note) => (
        <ThoughtEntry key={note.id} note={note} onUpdate={onNoteUpdate} />
      ))}
    </div>
  );
}

function TextArtifactView({
  artifact,
  onContentChange,
}: {
  artifact: Artifact;
  onContentChange: (content: string) => void;
}) {
  return (
    <textarea
      value={artifact.content ?? ""}
      onChange={(event) => onContentChange(event.target.value)}
      placeholder="Start writing…"
      className="min-h-0 flex-1 resize-none bg-transparent text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
    />
  );
}

export function Whiteboard({
  artifactId,
  refreshKey = 0,
  onClose,
  index = 3,
}: WhiteboardProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId) {
      setArtifact(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchArtifact(artifactId)
      .then((data) => {
        if (!cancelled) setArtifact(data);
      })
      .catch(() => {
        if (!cancelled) {
          setArtifact(null);
          setError("Could not load artifact.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artifactId, refreshKey]);

  async function handleContentChange(content: string) {
    if (!artifact || artifact.kind === THOUGHTS_JOURNAL_KIND) return;

    setArtifact((current) =>
      current ? { ...current, content } : current
    );

    try {
      const updated = await updateArtifact(artifact.id, { content });
      setArtifact(updated);
    } catch {
      setError("Could not save changes.");
    }
  }

  async function handleNoteUpdate(noteId: string, content: string) {
    try {
      const updated = await updateThought(noteId, content);
      setArtifact((current) => {
        if (!current?.notes) return current;
        return {
          ...current,
          notes: current.notes.map((note) =>
            note.id === noteId ? updated : note
          ),
        };
      });
      return updated;
    } catch {
      setError("Could not save changes.");
      throw new Error("Failed to update thought");
    }
  }

  const isJournal = artifact?.kind === THOUGHTS_JOURNAL_KIND;
  const displayTitle = artifact ? getArtifactDisplayTitle(artifact) : null;

  return (
    <Surface index={index} className="flex min-h-0 h-full flex-col !p-0">
      <div className="relative flex shrink-0 items-center gap-2.5 px-4 py-4 pr-12">
        <Label className="shrink-0">{displayTitle ?? "Whiteboard"}</Label>
        {artifact ? (
          <>
            <ArtifactTypeBadge kind={getArtifactTypeLabel(artifact.kind)} />
            <ArtifactProjectBadge project={artifact.project} />
          </>
        ) : null}
        {artifactId && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close artifact"
            className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {!artifactId && <EmptyState />}
        {artifactId && loading && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[13px] text-[var(--color-pumice)]">Loading…</span>
          </div>
        )}
        {artifactId && !loading && error && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[13px] text-[var(--color-ember)]">{error}</span>
          </div>
        )}
        {artifactId && !loading && artifact && !error && (
          <div className="flex min-h-0 flex-1 flex-col">
            {isJournal ? (
              <ThoughtJournalView
                notes={artifact.notes ?? []}
                onNoteUpdate={handleNoteUpdate}
              />
            ) : (
              <TextArtifactView
                artifact={artifact}
                onContentChange={handleContentChange}
              />
            )}
          </div>
        )}
      </div>
    </Surface>
  );
}
