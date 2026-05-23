export interface TodoProject {
  id: string;
  name: string;
  color: string | null;
}

export interface Todo {
  id: string;
  date: string;
  title: string;
  completed: boolean;
  projectId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  project?: TodoProject | null;
}

export interface CreateTodoInput {
  date: string;
  title?: string;
  projectId?: string | null;
}

export type UpdateTodoInput = Partial<
  Pick<Todo, "title" | "completed" | "projectId" | "position">
>;

export async function fetchTodos(date: string): Promise<Todo[]> {
  const response = await fetch(`/api/todos?date=${encodeURIComponent(date)}`);
  if (!response.ok) {
    throw new Error("Failed to load todos");
  }
  return response.json();
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create todo");
  }

  return response.json();
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput
): Promise<Todo> {
  const response = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update todo");
  }

  return response.json();
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await fetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete todo");
  }
}
