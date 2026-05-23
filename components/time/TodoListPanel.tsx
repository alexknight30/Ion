"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { TodoRow } from "@/components/time/TodoRow";
import { cn } from "@/lib/cn";
import { formatTodoListDate, toDateKey, type CalendarDate } from "@/lib/calendar";
import { fetchProjects, type Project } from "@/lib/projects";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  reorderTodos,
  updateTodo,
  type Todo,
} from "@/lib/todos";

interface TodoListPanelProps {
  selectedDate: CalendarDate;
  index?: number;
  className?: string;
}

function reorderTodoList(todos: Todo[], draggedId: string, insertIndex: number) {
  const fromIndex = todos.findIndex((todo) => todo.id === draggedId);
  if (fromIndex === -1) return todos;

  const next = [...todos];
  const [moved] = next.splice(fromIndex, 1);
  let targetIndex = insertIndex;
  if (fromIndex < targetIndex) targetIndex -= 1;
  if (targetIndex === fromIndex) return todos;

  next.splice(targetIndex, 0, moved);

  return next.map((todo, index) => ({ ...todo, position: index }));
}

export function TodoListPanel({
  selectedDate,
  index = 1,
  className,
}: TodoListPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [focusTodoId, setFocusTodoId] = useState<string | null>(null);
  const [deleteRevealedId, setDeleteRevealedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);

  const dateKey = toDateKey(selectedDate);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodos(dateKey);
      setTodos(data);
    } catch {
      setTodos([]);
      setError("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    void loadTodos();
    setDeleteRevealedId(null);
    setFocusTodoId(null);
    setDraggedTodoId(null);
    setDropInsertIndex(null);
  }, [loadTodos]);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (
        target.closest("[data-todo-delete]") ||
        target.closest("[data-todo-delete-swipe]") ||
        target.closest("[data-todo-drag-handle]")
      ) {
        return;
      }

      setDeleteRevealedId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function handleAddTodo() {
    if (adding) return;

    setAdding(true);
    setDeleteRevealedId(null);

    try {
      const todo = await createTodo({ date: dateKey, title: "" });
      setTodos((current) => [...current, todo]);
      setFocusTodoId(todo.id);
      setError(null);
    } catch {
      setError("Could not add task. Try restarting the dev server.");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateTodo(
    id: string,
    input: Partial<Pick<Todo, "title" | "completed" | "projectId">>
  ) {
    try {
      const updated = await updateTodo(id, input);
      setTodos((current) =>
        current.map((todo) => (todo.id === id ? updated : todo))
      );
    } catch {
      await loadTodos();
    }
  }

  async function handleDeleteTodo(id: string) {
    try {
      await deleteTodo(id);
      setTodos((current) => current.filter((todo) => todo.id !== id));
      if (deleteRevealedId === id) {
        setDeleteRevealedId(null);
      }
      if (focusTodoId === id) {
        setFocusTodoId(null);
      }
    } catch {
      await loadTodos();
    }
  }

  async function handleReorder(draggedId: string, insertIndex: number) {
    const reordered = reorderTodoList(todos, draggedId, insertIndex);
    const orderChanged = reordered.some(
      (todo, index) => todos[index]?.id !== todo.id
    );

    setDraggedTodoId(null);
    setDropInsertIndex(null);

    if (!orderChanged) return;

    setTodos(reordered);

    try {
      const updated = await reorderTodos(reordered);
      setTodos(updated);
    } catch {
      await loadTodos();
    }
  }

  function handleDragStart(todoId: string) {
    setDraggedTodoId(todoId);
    setDeleteRevealedId(null);
  }

  function handleDragEnd() {
    setDraggedTodoId(null);
    setDropInsertIndex(null);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    if (!draggedTodoId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const insertIndex = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
    setDropInsertIndex(insertIndex);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggedTodoId || dropInsertIndex === null) return;
    void handleReorder(draggedTodoId, dropInsertIndex);
  }

  return (
    <Surface
      index={index}
      className={cn("flex min-h-0 flex-col px-4 py-8", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label>To-Do List</Label>
          <p className="mt-2 text-[13px] tracking-[-0.01em] text-[var(--color-pumice)]">
            {formatTodoListDate(selectedDate)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Add task"
          onClick={() => void handleAddTodo()}
          disabled={adding}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)] disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-[13px] text-[var(--color-ember)]">{error}</span>
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-[13px] text-[var(--color-pumice)]">Loading…</span>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-[13px] text-[var(--color-pumice)]">
              No tasks yet
            </span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {todos.map((todo, todoIndex) => (
              <div
                key={todo.id}
                onDragOver={(event) => handleDragOver(event, todoIndex)}
                onDrop={handleDrop}
                className={cn(
                  "relative",
                  draggedTodoId === todo.id && "opacity-50",
                  dropInsertIndex === todoIndex &&
                    draggedTodoId &&
                    draggedTodoId !== todo.id &&
                    "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[var(--color-aurora)]",
                  dropInsertIndex === todoIndex + 1 &&
                    draggedTodoId &&
                    draggedTodoId !== todo.id &&
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[var(--color-aurora)]"
                )}
              >
                <TodoRow
                  todo={todo}
                  projects={projects}
                  autoFocus={focusTodoId === todo.id}
                  isDeleteRevealed={deleteRevealedId === todo.id}
                  isDraggingOrder={draggedTodoId === todo.id}
                  onRevealDelete={() => setDeleteRevealedId(todo.id)}
                  onCloseActions={() => setDeleteRevealedId(null)}
                  onInteractionStart={() => {
                    if (deleteRevealedId && deleteRevealedId !== todo.id) {
                      setDeleteRevealedId(null);
                    }
                  }}
                  onDragStart={() => handleDragStart(todo.id)}
                  onDragEnd={handleDragEnd}
                  onUpdate={handleUpdateTodo}
                  onDelete={handleDeleteTodo}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}
