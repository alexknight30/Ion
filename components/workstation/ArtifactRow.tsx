"use client";

import type { Artifact } from "@/lib/artifacts";
import {
  getArtifactDisplayTitle,
  getArtifactTypeLabel,
} from "@/lib/artifact-constants";
import { cn } from "@/lib/cn";

interface ArtifactRowProps {
  artifact: Artifact;
  isActive?: boolean;
  onOpen: (artifactId: string) => void;
}

export function ArtifactRow({
  artifact,
  isActive = false,
  onOpen,
}: ArtifactRowProps) {
  const title = getArtifactDisplayTitle(artifact);
  const subtitle = getArtifactTypeLabel(artifact.kind);

  return (
    <button
      type="button"
      onClick={() => onOpen(artifact.id)}
      className="flex w-full items-center justify-between gap-3 py-2.5 pr-1 text-left transition-colors duration-200 hover:text-[var(--color-glacier)]"
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[14px] tracking-[-0.01em]",
            isActive
              ? "font-medium text-[var(--color-glacier)]"
              : "text-[var(--color-bone)]"
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "block truncate text-[12px] tracking-[-0.01em]",
            isActive ? "text-[var(--color-steam)]" : "text-[var(--color-pumice)]"
          )}
        >
          {artifact.project?.name ?? "Unassigned"} · {subtitle}
        </span>
      </span>
      {artifact.project?.color && (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: artifact.project.color }}
          aria-hidden
        />
      )}
    </button>
  );
}
