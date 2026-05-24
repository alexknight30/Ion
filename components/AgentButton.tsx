"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { SmartInput } from "@/components/ui/SmartTextarea";
import { sendAgentMessage } from "@/lib/agent";
import { getTodayDate, toDateKey } from "@/lib/calendar";

const ease = [0.16, 1, 0.3, 1] as const;
const CLICK_DELAY_MS = 250;
const BUTTON_SIZE_PX = 56;
const LEFT_OFFSET_PX = 24;
const DOCKED_VISIBLE_PX = 15;
const DOCKED_OFFSET_PX =
  LEFT_OFFSET_PX + BUTTON_SIZE_PX - DOCKED_VISIBLE_PX;

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
}: AgentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

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
    };
  }, []);

  async function handleSend() {
    const trimmed = query.trim();
    if (!trimmed || isThinking) return;

    setIsThinking(true);
    setError(null);
    setReply(null);

    try {
      const result = await sendAgentMessage({
        message: trimmed,
        conversationId,
        context: {
          currentTab,
          currentDate: toDateKey(getTodayDate()),
        },
      });

      setConversationId(result.conversationId);
      setReply(result.reply);
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

  return (
    <motion.div
      className={cn(
        "fixed bottom-6 left-6 z-50 flex w-auto flex-col items-start gap-3 overflow-visible",
        className
      )}
      animate={{ x: docked ? -DOCKED_OFFSET_PX : 0 }}
      transition={{ duration: 0.4, ease }}
    >
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
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="overflow-hidden"
            >
              <div className="flex h-14 w-[360px] items-center rounded-[12px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)]">
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

      {open && (reply || error || isThinking) ? (
        <div className="ml-[68px] w-[360px] rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-4 py-3 shadow-[0_2px_12px_var(--color-shadow-soft)]">
          {isThinking ? (
            <p className="text-[13px] text-[var(--color-pumice)]">Thinking…</p>
          ) : null}
          {error ? (
            <p className="text-[13px] text-[var(--color-ember)]">{error}</p>
          ) : null}
          {reply ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed tracking-[-0.01em] text-[var(--color-bone)]">
              {reply}
            </p>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
