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
  updateTodo,
  type Todo,
} from "@/lib/todos";

interface TodoListPanelProps {
  selectedDate: CalendarDate;
  index?: number;
  className?: string;
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

  const dateKey = toDateKey(selectedDate);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTodos(dateKey);
      setTodos(data);
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    void loadTodos();
    setDeleteRevealedId(null);
    setFocusTodoId(null);
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
        target.closest("[data-todo-row]")
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
    } catch {
      // Keep list unchanged on failure.
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

  return (
    <Surface index={index} className={cn("flex min-h-0 flex-col", className)}>
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
        {loading ? (
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
            {todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                projects={projects}
                autoFocus={focusTodoId === todo.id}
                isDeleteRevealed={deleteRevealedId === todo.id}
                onRevealDelete={() => setDeleteRevealedId(todo.id)}
                onCloseActions={() => setDeleteRevealedId(null)}
                onInteractionStart={() => {
                  if (deleteRevealedId && deleteRevealedId !== todo.id) {
                    setDeleteRevealedId(null);
                  }
                }}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
              />
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}
