export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  contextSnapshot: string | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const response = await fetch("/api/conversations");
  if (!response.ok) {
    throw new Error("Failed to load conversations");
  }
  return response.json();
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await fetch(`/api/conversations/${conversationId}`);
  if (!response.ok) {
    throw new Error("Failed to load conversation");
  }
  return response.json();
}

export async function createConversation(): Promise<ConversationSummary> {
  const response = await fetch("/api/conversations", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }
  return response.json();
}

export function getConversationDisplayTitle(
  conversation: Pick<ConversationSummary, "title">
) {
  const trimmed = conversation.title?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "New conversation";
}

export function formatConversationDate(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
