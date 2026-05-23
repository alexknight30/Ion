"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";
import {
  getArtifactDisplayTitle,
  THOUGHTS_JOURNAL_KIND,
} from "@/lib/artifact-constants";
import { fetchArtifact, updateArtifact, type Artifact } from "@/lib/artifacts";
import { formatThoughtTimestamp } from "@/lib/format";

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

function ThoughtJournalView({ artifact }: { artifact: Artifact }) {
  const notes = artifact.notes ?? [];

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
        <article key={note.id} className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]">
            [{formatThoughtTimestamp(note.createdAt)}]
          </h3>
          <p className="whitespace-pre-wrap text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
            {note.content}
          </p>
        </article>
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

  const isJournal = artifact?.kind === THOUGHTS_JOURNAL_KIND;
  const displayTitle = artifact ? getArtifactDisplayTitle(artifact) : null;

  return (
    <Surface index={index} className="flex min-h-0 h-full flex-col !p-0">
      <div className="relative flex shrink-0 items-center px-4 py-4">
        <Label>{displayTitle ?? "Whiteboard"}</Label>
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
              <ThoughtJournalView artifact={artifact} />
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
