"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { SmartInput } from "@/components/ui/SmartTextarea";
import { FormattedText } from "@/components/ui/FormattedText";
import { UserMessage } from "@/components/chat/UserMessage";
import { streamAgentMessage } from "@/lib/agent";
import { getTodayDate, toDateKey } from "@/lib/calendar";

const ease = [0.16, 1, 0.3, 1] as const;
const CLICK_DELAY_MS = 250;
const BUTTON_SIZE_PX = 56;
const INPUT_WIDTH_PX = 480;
const ROW_GAP_PX = 12;
const LEFT_OFFSET_PX = 24;
const DOCKED_VISIBLE_PX = 15;
const DOCKED_OFFSET_PX =
  LEFT_OFFSET_PX + BUTTON_SIZE_PX - DOCKED_VISIBLE_PX;
const PANEL_WIDTH_PX = BUTTON_SIZE_PX + ROW_GAP_PX + INPUT_WIDTH_PX;

export interface AgentButtonState {
  open: boolean;
  docked: boolean;
  query: string;
  onOpenChange: (open: boolean) => void;
  onDockedChange: (docked: boolean) => void;
  onQueryChange: (query: string) => void;
}

interface AgentButtonProps extends AgentButtonState {
  currentTab: string;
  placeholder?: string;
  className?: string;
  onOpenInChat?: (conversationId: string) => void;
}

export function AgentButton({
  currentTab,
  placeholder = "Ask Ion",
  className,
  open,
  docked,
  query,
  onOpenChange,
  onDockedChange,
  onQueryChange,
  onOpenInChat,
}: AgentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const streamBufferRef = useRef("");
  const streamRafRef = useRef<number | null>(null);

  const showResponseCard =
    open &&
    (lastUserMessage || reply || error || (isThinking && !reply));

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      if (streamRafRef.current !== null) {
        cancelAnimationFrame(streamRafRef.current);
      }
    };
  }, []);

  const flushReply = (finalReply: string) => {
    if (streamRafRef.current !== null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
    streamBufferRef.current = finalReply;
    setReply(finalReply);
  };

  const appendReplyDelta = (delta: string) => {
    streamBufferRef.current += delta;

    if (streamRafRef.current !== null) return;

    streamRafRef.current = requestAnimationFrame(() => {
      streamRafRef.current = null;
      setReply(streamBufferRef.current);
    });
  };

  async function handleSend() {
    const trimmed = query.trim();
    if (!trimmed || isThinking) return;

    setLastUserMessage(trimmed);
    setIsThinking(true);
    setError(null);
    setReply(null);
    streamBufferRef.current = "";

    try {
      const result = await streamAgentMessage({
        message: trimmed,
        conversationId,
        context: {
          currentTab,
          currentDate: toDateKey(getTodayDate()),
        },
        onMeta: ({ conversationId: nextConversationId }) => {
          setConversationId(nextConversationId);
        },
        onDelta: appendReplyDelta,
        onDone: ({ reply: nextReply }) => {
          flushReply(nextReply);
        },
      });

      setConversationId(result.conversationId);
      flushReply(result.reply);
      onQueryChange("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send message"
      );
    } finally {
      setIsThinking(false);
    }
  }

  function handleClick() {
    if (docked) {
      onDockedChange(false);
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      onOpenChange(!open);
      clickTimerRef.current = null;
    }, CLICK_DELAY_MS);
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    onOpenChange(false);
    onDockedChange(true);
  }

  function handleOpenInChat() {
    if (!conversationId || !onOpenInChat) return;
    onOpenInChat(conversationId);
  }

  return (
    <motion.div
      className={cn(
        "fixed bottom-6 left-6 z-50 flex w-auto flex-col items-start gap-3 overflow-visible",
        className
      )}
      animate={{ x: docked ? -DOCKED_OFFSET_PX : 0 }}
      transition={{ duration: 0.4, ease }}
    >
      {showResponseCard ? (
        <div
          className="rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-4 py-3 shadow-[0_2px_12px_var(--color-shadow-soft)]"
          style={{ width: PANEL_WIDTH_PX }}
        >
          {conversationId && onOpenInChat ? (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={handleOpenInChat}
                disabled={isThinking}
                className="text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)] transition-colors duration-200 hover:text-[var(--color-glacier)] disabled:opacity-50"
              >
                Open in Chat
              </button>
            </div>
          ) : null}

          {lastUserMessage ? (
            <UserMessage content={lastUserMessage} className="mb-3 flex justify-end" />
          ) : null}

          {isThinking && !reply ? (
            <p className="text-[13px] text-[var(--color-pumice)]">Thinking…</p>
          ) : null}
          {error ? (
            <p className="text-[13px] text-[var(--color-ember)]">{error}</p>
          ) : null}
          {reply ? (
            <FormattedText
              content={reply}
              streaming={isThinking}
              renderBulletLists
              className="text-[14px] leading-relaxed tracking-[-0.01em] text-[var(--color-bone)]"
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          aria-label={
            docked ? "Show agent button" : open ? "Close agent" : "Open agent"
          }
          aria-expanded={open}
          className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)] transition-shadow duration-200 hover:shadow-[0_4px_24px_var(--color-shadow-hover),0_0_0_1px_var(--color-border-active)]"
        >
          <Image
            src="/ion.svg"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 scale-[1.35]"
            priority
          />
        </motion.button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: INPUT_WIDTH_PX, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="overflow-hidden"
            >
              <div
                className="flex h-14 items-center rounded-[12px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)]"
                style={{ width: INPUT_WIDTH_PX }}
              >
                <SmartInput
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={onQueryChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSend();
                    }
                  }}
                  placeholder={placeholder}
                  disabled={isThinking}
                  className="min-w-0 flex-1 bg-transparent px-5 text-[15px] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={!query.trim() || isThinking}
                  className={cn(
                    "shrink-0 px-5 text-[13px] font-medium transition-colors duration-200 disabled:opacity-50",
                    query.trim() && !isThinking
                      ? "text-[var(--color-glacier)] hover:text-[var(--color-aurora)]"
                      : "text-[var(--color-pumice)]"
                  )}
                >
                  {isThinking ? "…" : "Send"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
