"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/projects";
import type { Todo } from "@/lib/todos";

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 28;
const AXIS_LOCK_THRESHOLD = 10;

interface TodoProjectPickerProps {
  projects: Project[];
  projectId: string | null;
  onChange: (projectId: string | null) => void;
}

function TodoProjectPicker({
  projects,
  projectId,
  onChange,
}: TodoProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedProject = projects.find((project) => project.id === projectId);

  useEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 200;
      setMenuPosition({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - width),
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (
        buttonRef.current?.contains(target) ||
        target.closest("[data-todo-project-menu]")
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function stopRowInteraction(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function selectProject(nextProjectId: string | null) {
    onChange(nextProjectId);
    setOpen(false);
  }

  function handleMenuPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    nextProjectId: string | null
  ) {
    event.preventDefault();
    event.stopPropagation();
    selectProject(nextProjectId);
  }

  const menu =
    open && menuPosition
      ? createPortal(
          <ul
            data-todo-project-menu
            role="listbox"
            aria-label="Projects"
            onMouseDown={(event) => event.preventDefault()}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            className="fixed z-[100] max-h-48 overflow-y-auto rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]"
          >
            <li role="option" aria-selected={projectId === null}>
              <button
                type="button"
                onPointerDown={(event) => handleMenuPointerDown(event, null)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]",
                  projectId === null && "bg-[var(--color-ash)]"
                )}
              >
                <span>No project</span>
                <span className="h-3 w-3 rounded-full border border-[var(--color-frost)]" />
              </button>
            </li>
            {projects.length === 0 ? (
              <li className="px-3 py-2 text-[12px] text-[var(--color-pumice)]">
                Create a project in Workstation first.
              </li>
            ) : (
              projects.map((project) => (
                <li
                  key={project.id}
                  role="option"
                  aria-selected={project.id === projectId}
                >
                  <button
                    type="button"
                    onPointerDown={(event) =>
                      handleMenuPointerDown(event, project.id)
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]",
                      project.id === projectId && "bg-[var(--color-ash)]"
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                    {project.color ? (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    ) : (
                      <span className="h-3 w-3 shrink-0 rounded-full border border-[var(--color-frost)]" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div
      data-todo-project-picker
      className="shrink-0"
      onPointerDown={stopRowInteraction}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          selectedProject
            ? `Project: ${selectedProject.name}. Change project`
            : "Select project"
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          stopRowInteraction(event);
          setOpen((current) => !current);
        }}
        onPointerDown={stopRowInteraction}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[var(--color-ash)]"
      >
        {selectedProject?.color ? (
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: selectedProject.color }}
          />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full border border-[var(--color-frost)]" />
        )}
      </button>
      {menu}
    </div>
  );
}

interface TodoRowProps {
  todo: Todo;
  projects: Project[];
  autoFocus?: boolean;
  isDeleteRevealed: boolean;
  onRevealDelete: () => void;
  onCloseActions: () => void;
  onInteractionStart?: () => void;
  onUpdate: (
    id: string,
    input: Partial<Pick<Todo, "title" | "completed" | "projectId">>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TodoRow({
  todo,
  projects,
  autoFocus = false,
  isDeleteRevealed,
  onRevealDelete,
  onCloseActions,
  onInteractionStart,
  onUpdate,
  onDelete,
}: TodoRowProps) {
  const [title, setTitle] = useState(todo.title);
  const [deleteOffset, setDeleteOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startDeleteOffset = useRef(0);
  const dragAxis = useRef<"horizontal-left" | "close-delete" | "vertical" | null>(
    null
  );
  const hasMoved = useRef(false);
  const didSwipe = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTitle = useRef(todo.title);

  const openDeleteOffset = isDeleteRevealed ? ACTION_WIDTH : 0;
  const displayDeleteOffset = isDragging ? deleteOffset : openDeleteOffset;
  const deleteVisible =
    isDeleteRevealed || displayDeleteOffset >= SWIPE_THRESHOLD;

  useEffect(() => {
    setTitle(todo.title);
    lastSavedTitle.current = todo.title;
  }, [todo.id, todo.title]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus, todo.id]);

  useEffect(() => {
    if (!isDeleteRevealed && !isDragging) {
      setDeleteOffset(0);
    }
  }, [isDeleteRevealed, isDragging]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  async function persistTitle(value: string) {
    if (value === lastSavedTitle.current) return;

    if (!value.trim()) {
      await onDelete(todo.id);
      return;
    }

    await onUpdate(todo.id, { title: value });
    lastSavedTitle.current = value;
  }

  function handleTitleChange(value: string) {
    setTitle(value);

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      void persistTitle(value);
    }, 400);
  }

  async function handleTitleBlur() {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }

    await persistTitle(title);
  }

  async function handleToggleComplete() {
    await onUpdate(todo.id, { completed: !todo.completed });
  }

  function handleRowPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (deleting) return;

    onInteractionStart?.();
    startX.current = event.clientX;
    startY.current = event.clientY;
    startDeleteOffset.current = isDeleteRevealed ? ACTION_WIDTH : 0;
    dragAxis.current = null;
    hasMoved.current = false;
    didSwipe.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRowPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || deleting) return;

    const deltaXLeft = startX.current - event.clientX;
    const deltaXRight = event.clientX - startX.current;
    const deltaY = startY.current - event.clientY;
    const deleteWasOpen = startDeleteOffset.current > 0;

    if (!dragAxis.current) {
      if (
        deltaXLeft < AXIS_LOCK_THRESHOLD &&
        Math.abs(deltaY) < AXIS_LOCK_THRESHOLD &&
        deltaXRight < AXIS_LOCK_THRESHOLD
      ) {
        return;
      }

      if (Math.abs(deltaY) > Math.max(deltaXLeft, deltaXRight)) {
        dragAxis.current = "vertical";
      } else if (deleteWasOpen && deltaXRight >= AXIS_LOCK_THRESHOLD) {
        dragAxis.current = "close-delete";
      } else if (deltaXLeft >= AXIS_LOCK_THRESHOLD) {
        dragAxis.current = "horizontal-left";
      } else {
        return;
      }
    }

    if (dragAxis.current === "vertical") return;

    hasMoved.current = true;
    didSwipe.current = true;
    event.preventDefault();

    if (dragAxis.current === "close-delete") {
      setDeleteOffset(Math.max(0, startDeleteOffset.current - deltaXRight));
      return;
    }

    setDeleteOffset(
      Math.min(
        ACTION_WIDTH,
        Math.max(0, startDeleteOffset.current + deltaXLeft)
      )
    );
  }

  function handleRowPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || deleting) return;

    setIsDragging(false);

    if (dragAxis.current === "vertical" || !hasMoved.current) {
      setDeleteOffset(openDeleteOffset);
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
      return;
    }

    if (deleteOffset > SWIPE_THRESHOLD) {
      onRevealDelete();
      setDeleteOffset(ACTION_WIDTH);
      return;
    }

    onCloseActions();
    setDeleteOffset(0);
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (deleting) return;

    setDeleting(true);
    try {
      await onDelete(todo.id);
      onCloseActions();
    } finally {
      setDeleting(false);
    }
  }

  function stopSwipePropagation(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        data-todo-delete
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
        style={{ transform: `translateX(-${displayDeleteOffset}px)` }}
        className={cn(
          "relative bg-[var(--color-obsidian)]",
          !isDragging &&
            "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        )}
      >
        <div
          data-todo-row
          onPointerDown={handleRowPointerDown}
          onPointerMove={handleRowPointerMove}
          onPointerUp={handleRowPointerUp}
          onPointerCancel={handleRowPointerUp}
          className="flex touch-pan-y items-center gap-3 py-2.5"
        >
          <button
            type="button"
            data-todo-complete
            aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
            onClick={() => {
              void handleToggleComplete();
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center"
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200",
                todo.completed
                  ? "border-[var(--color-glacier)] bg-[var(--color-glacier)]"
                  : "border-[var(--color-pumice)] bg-transparent"
              )}
            >
              {todo.completed ? (
                <Check size={10} strokeWidth={2.5} className="text-[var(--color-obsidian)]" />
              ) : null}
            </span>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            onBlur={() => void handleTitleBlur()}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder="New task"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[14px] tracking-[-0.01em] outline-none placeholder:text-[var(--color-pumice)]",
              todo.completed
                ? "text-[var(--color-pumice)] line-through decoration-[var(--color-pumice)]"
                : "text-[var(--color-bone)]"
            )}
          />

          <TodoProjectPicker
            projects={projects}
            projectId={todo.projectId}
            onChange={(projectId) => {
              void onUpdate(todo.id, { projectId });
            }}
          />
        </div>
      </div>
    </div>
  );
}
