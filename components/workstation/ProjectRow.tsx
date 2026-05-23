"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/projects";

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 28;
const AXIS_LOCK_THRESHOLD = 10;
const DIRECTION_BIAS = 1.5;

const PROJECT_SUBOPTIONS = ["Artifacts", "Thoughts"] as const;

interface ProjectRowProps {
  project: Project;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDeleteRevealed: boolean;
  isEditRevealed: boolean;
  onRevealDelete: () => void;
  onRevealEdit: () => void;
  onCloseActions: () => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (project: Project) => void;
  onInteractionStart?: () => void;
}

export function ProjectRow({
  project,
  isExpanded,
  onToggleExpand,
  isDeleteRevealed,
  isEditRevealed,
  onRevealDelete,
  onRevealEdit,
  onCloseActions,
  onDelete,
  onEdit,
  onInteractionStart,
}: ProjectRowProps) {
  const [deleteOffset, setDeleteOffset] = useState(0);
  const [editOffset, setEditOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startDeleteOffset = useRef(0);
  const startEditOffset = useRef(0);
  const dragAxis = useRef<
    "horizontal-left" | "horizontal-right" | "close-edit" | "close-delete" | "vertical" | null
  >(null);
  const hasMoved = useRef(false);

  const openDeleteOffset = isDeleteRevealed ? ACTION_WIDTH : 0;
  const openEditOffset = isEditRevealed ? ACTION_WIDTH : 0;
  const displayDeleteOffset = isDragging ? deleteOffset : openDeleteOffset;
  const displayEditOffset = isDragging ? editOffset : openEditOffset;

  useEffect(() => {
    if (!isDeleteRevealed && !isDragging) {
      setDeleteOffset(0);
    }
  }, [isDeleteRevealed, isDragging]);

  useEffect(() => {
    if (!isEditRevealed && !isDragging) {
      setEditOffset(0);
    }
  }, [isEditRevealed, isDragging]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (deleting) return;

    onInteractionStart?.();
    startX.current = event.clientX;
    startY.current = event.clientY;
    startDeleteOffset.current = isDeleteRevealed ? ACTION_WIDTH : 0;
    startEditOffset.current = isEditRevealed ? ACTION_WIDTH : 0;
    dragAxis.current = null;
    hasMoved.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || deleting) return;

    const deltaXLeft = startX.current - event.clientX;
    const deltaXRight = event.clientX - startX.current;
    const deltaY = startY.current - event.clientY;
    const editWasOpen = startEditOffset.current > 0;
    const deleteWasOpen = startDeleteOffset.current > 0;

    if (!dragAxis.current) {
      const horizontal = Math.max(deltaXLeft, deltaXRight);
      if (
        horizontal < AXIS_LOCK_THRESHOLD &&
        Math.abs(deltaY) < AXIS_LOCK_THRESHOLD
      ) {
        return;
      }

      if (Math.abs(deltaY) > horizontal) {
        dragAxis.current = "vertical";
      } else if (editWasOpen && deltaXLeft >= AXIS_LOCK_THRESHOLD) {
        dragAxis.current = "close-edit";
      } else if (deleteWasOpen && deltaXRight >= AXIS_LOCK_THRESHOLD) {
        dragAxis.current = "close-delete";
      } else if (deltaXLeft > deltaXRight * DIRECTION_BIAS) {
        dragAxis.current = "horizontal-left";
      } else if (deltaXRight > deltaXLeft * DIRECTION_BIAS) {
        dragAxis.current = "horizontal-right";
      } else {
        return;
      }
    }

    if (dragAxis.current === "vertical") return;

    hasMoved.current = true;
    event.preventDefault();

    if (dragAxis.current === "close-edit") {
      const next = Math.max(0, startEditOffset.current - deltaXLeft);
      setEditOffset(next);
      setDeleteOffset(0);
      return;
    }

    if (dragAxis.current === "close-delete") {
      const next = Math.max(0, startDeleteOffset.current - deltaXRight);
      setDeleteOffset(next);
      setEditOffset(0);
      return;
    }

    if (dragAxis.current === "horizontal-left") {
      const next = Math.min(
        ACTION_WIDTH,
        Math.max(0, startDeleteOffset.current + deltaXLeft)
      );
      setDeleteOffset(next);
      setEditOffset(0);
      return;
    }

    const next = Math.min(
      ACTION_WIDTH,
      Math.max(0, startEditOffset.current + deltaXRight)
    );
    setEditOffset(next);
    setDeleteOffset(0);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || deleting) return;

    setIsDragging(false);

    if (dragAxis.current === "vertical") {
      setDeleteOffset(openDeleteOffset);
      setEditOffset(openEditOffset);
      return;
    }

    if (!hasMoved.current) {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("[data-project-suboption]")
      ) {
        onToggleExpand();
      }
      return;
    }

    if (dragAxis.current === "close-edit") {
      if (editOffset > SWIPE_THRESHOLD) {
        onRevealEdit();
        setEditOffset(ACTION_WIDTH);
      } else {
        onCloseActions();
        setEditOffset(0);
      }
      setDeleteOffset(0);
      return;
    }

    if (dragAxis.current === "close-delete") {
      if (deleteOffset > SWIPE_THRESHOLD) {
        onRevealDelete();
        setDeleteOffset(ACTION_WIDTH);
      } else {
        onCloseActions();
        setDeleteOffset(0);
      }
      setEditOffset(0);
      return;
    }

    if (dragAxis.current === "horizontal-left") {
      if (deleteOffset > SWIPE_THRESHOLD) {
        onRevealDelete();
        setDeleteOffset(ACTION_WIDTH);
        setEditOffset(0);
        return;
      }

      onCloseActions();
      setDeleteOffset(0);
      setEditOffset(0);
      return;
    }

    if (editOffset > SWIPE_THRESHOLD) {
      onRevealEdit();
      setEditOffset(ACTION_WIDTH);
      setDeleteOffset(0);
      return;
    }

    onCloseActions();
    setEditOffset(0);
    setDeleteOffset(0);
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (deleting) return;

    setDeleting(true);
    try {
      await onDelete(project.id);
      onCloseActions();
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onEdit(project);
    onCloseActions();
  }

  function stopSwipePropagation(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  const deleteVisible =
    isDeleteRevealed || displayDeleteOffset >= SWIPE_THRESHOLD;
  const editVisible = isEditRevealed || displayEditOffset >= SWIPE_THRESHOLD;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative overflow-hidden"
    >
      <button
        type="button"
        data-project-edit
        onClick={handleEdit}
        onPointerDown={stopSwipePropagation}
        onPointerUp={stopSwipePropagation}
        style={{
          transform: `translateX(calc(-100% + ${displayEditOffset}px))`,
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-10 flex w-[72px] cursor-pointer items-center justify-center bg-[var(--color-frost)] text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          editVisible ? "pointer-events-auto" : "pointer-events-none",
          isDragging && "transition-none"
        )}
      >
        Edit
      </button>

      <button
        type="button"
        data-project-delete
        onClick={handleDelete}
        onPointerDown={stopSwipePropagation}
        onPointerUp={stopSwipePropagation}
        disabled={deleting}
        style={{
          transform: `translateX(calc(100% - ${displayDeleteOffset}px))`,
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

      <div
        style={{ transform: `translateX(${displayEditOffset}px)` }}
        className={cn(
          "relative bg-[var(--color-obsidian)]",
          !isDragging &&
            "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        )}
      >
        <div
          className={cn(
            "flex touch-pan-y items-center gap-3 py-2.5",
            displayEditOffset > 0 && "pl-4"
          )}
        >
          <span className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.01em] text-[var(--color-bone)]">
            {project.name}
          </span>

          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {project.color && (
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col pb-2">
            {PROJECT_SUBOPTIONS.map((label) => (
              <button
                key={label}
                type="button"
                data-project-suboption
                className="flex items-center gap-1.5 py-1.5 text-left text-[13px] tracking-[-0.01em] text-[var(--color-steam)] transition-colors duration-200 hover:text-[var(--color-bone)]"
              >
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className="shrink-0 text-[var(--color-pumice)]"
                />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
