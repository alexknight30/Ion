"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { getRandomChatGreeting } from "@/lib/chat-greetings";
import { fetchProfile, getFirstName } from "@/lib/profile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function EmptyState({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] shadow-[0_1px_3px_var(--color-shadow-soft)]">
        <Image
          src="/ion.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 scale-[1.35]"
        />
      </div>
      <h2 className="max-w-md text-[22px] font-medium tracking-[-0.02em] text-[var(--color-glacier)]">
        {greeting}
      </h2>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[18px] bg-[var(--color-ash)] px-4 py-3 text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] text-[15px] leading-[1.7] tracking-[-0.01em] text-[var(--color-bone)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 py-1 text-[14px] text-[var(--color-pumice)]">
        <span className="animate-pulse">Thinking</span>
        <span className="inline-flex w-4 animate-pulse">…</span>
      </div>
    </div>
  );
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [greeting, setGreeting] = useState("Ask Ion");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingReply = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = input.trim().length > 0 && !isThinking;

  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then((profile) => {
        if (!cancelled) {
          setGreeting(getRandomChatGreeting(getFirstName(profile.name)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGreeting(getRandomChatGreeting(""));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      if (pendingReply.current) {
        clearTimeout(pendingReply.current);
      }
    };
  }, []);

  function adjustInputHeight() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "32px";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 32), 160)}px`;
  }

  useEffect(() => {
    adjustInputHeight();
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    pendingReply.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "I'm not connected yet, but your message is saved in this chat. Agent responses will appear here once the backend is wired up."
        ),
      ]);
      setIsThinking(false);
    }, 700);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 md:px-4"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-6">
          {messages.length === 0 && !isThinking ? (
            <EmptyState greeting={greeting} />
          ) : (
            <>
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserMessage key={message.id} content={message.content} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    content={message.content}
                  />
                )
              )}
              {isThinking ? <ThinkingIndicator /> : null}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-2 md:px-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center gap-2 rounded-[16px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] px-3 py-2 shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)]">
            <button
              type="button"
              aria-label="Add attachment"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
            >
              <Plus size={18} strokeWidth={1.5} />
            </button>

            <div className="flex min-h-8 flex-1 items-center">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Ion"
                rows={1}
                className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-8 outline-none placeholder:text-[var(--color-pumice)]"
                style={{ height: "32px" }}
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,opacity] duration-200",
                canSend
                  ? "bg-[var(--color-glacier)] text-[var(--color-obsidian)] hover:bg-[var(--color-bone)]"
                  : "bg-[var(--color-frost)] text-[var(--color-pumice)]"
              )}
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
