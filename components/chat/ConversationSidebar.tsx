"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatConversationDate,
  getConversationDisplayTitle,
  type ConversationSummary,
} from "@/lib/conversations";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  loading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  loading,
  onSelectConversation,
  onNewChat,
}: ConversationSidebarProps) {
  return (
    <aside className="flex h-full w-[17rem] shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-void)]">
      <div className="shrink-0 border-b border-[var(--color-border-subtle)] px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-[10px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]"
        >
          <Plus size={15} strokeWidth={1.5} />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-2 py-3 text-[12px] text-[var(--color-pumice)]">
            Loading conversations…
          </p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-[var(--color-pumice)]">
            No conversations yet
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-200",
                      active
                        ? "bg-[var(--color-ash)]"
                        : "hover:bg-[var(--color-ash)]/70"
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-[13px] tracking-[-0.01em]",
                        active
                          ? "font-medium text-[var(--color-glacier)]"
                          : "text-[var(--color-bone)]"
                      )}
                    >
                      {getConversationDisplayTitle(conversation)}
                    </span>
                    <span className="text-[11px] text-[var(--color-pumice)]">
                      {formatConversationDate(conversation.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
