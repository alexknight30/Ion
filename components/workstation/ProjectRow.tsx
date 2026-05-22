"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/projects";

const DELETE_WIDTH = 72;
const SWIPE_THRESHOLD = 28;

interface ProjectRowProps {
  project: Project;
  isRevealed: boolean;
  onReveal: () => void;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onInteractionStart?: () => void;
}

export function ProjectRow({
  project,
  isRevealed,
  onReveal,
  onClose,
  onDelete,
  onInteractionStart,
}: ProjectRowProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const dragAxis = useRef<"horizontal" | "vertical" | null>(null);

  const openOffset = isRevealed ? DELETE_WIDTH : 0;
  const displayOffset = isDragging ? dragOffset : openOffset;

  useEffect(() => {
    if (!isRevealed && !isDragging) {
      setDragOffset(0);
    }
  }, [isRevealed, isDragging]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (deleting) return;

    onInteractionStart?.();
    startX.current = event.clientX;
    startY.current = event.clientY;
    startOffset.current = isRevealed ? DELETE_WIDTH : 0;
    dragAxis.current = null;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || deleting) return;

    const deltaX = startX.current - event.clientX;
    const deltaY = startY.current - event.clientY;

    if (!dragAxis.current) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      dragAxis.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (dragAxis.current === "vertical") return;

    event.preventDefault();
    const next = Math.min(
      DELETE_WIDTH,
      Math.max(0, startOffset.current + deltaX)
    );
    setDragOffset(next);
  }

  function handlePointerUp() {
    if (!isDragging || deleting) return;

    setIsDragging(false);

    if (dragAxis.current === "vertical") {
      setDragOffset(openOffset);
      return;
    }

    if (dragOffset > SWIPE_THRESHOLD) {
      onReveal();
      setDragOffset(DELETE_WIDTH);
      return;
    }

    onClose();
    setDragOffset(0);
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (deleting) return;

    setDeleting(true);
    try {
      await onDelete(project.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  function stopSwipePropagation(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  const deleteVisible = isRevealed || displayOffset >= SWIPE_THRESHOLD;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative overflow-hidden"
    >
      <div className="relative flex touch-pan-y items-center gap-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.01em] text-[var(--color-bone)]">
          {project.name}
        </span>

        <div className="relative z-0 flex h-6 w-6 shrink-0 items-center justify-center">
          {project.color && (
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden
            />
          )}
        </div>

        <button
          type="button"
          data-project-delete
          onClick={handleDelete}
          onPointerDown={stopSwipePropagation}
          onPointerUp={stopSwipePropagation}
          disabled={deleting}
          style={{
            transform: `translateX(calc(100% - ${displayOffset}px))`,
          }}
          className={cn(
            "absolute inset-y-0 right-0 z-10 flex w-[72px] cursor-pointer items-center justify-center bg-[var(--color-ember)] text-[13px] font-medium tracking-[-0.01em] text-[var(--color-void)] disabled:opacity-60",
            deleteVisible ? "pointer-events-auto" : "pointer-events-none",
            !isDragging &&
              "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          )}
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
