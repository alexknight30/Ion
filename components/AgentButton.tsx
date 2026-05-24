"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { SmartInput } from "@/components/ui/SmartTextarea";

const ease = [0.16, 1, 0.3, 1] as const;
const CLICK_DELAY_MS = 250;
const BUTTON_SIZE_PX = 56; // w-14
const LEFT_OFFSET_PX = 24; // left-6
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
  placeholder?: string;
  className?: string;
}

export function AgentButton({
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

  function handleSend() {
    // TODO: wire up agent
    if (!query.trim()) return;
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
        "fixed bottom-6 left-6 z-50 flex w-auto items-center gap-3 overflow-visible",
        className
      )}
      animate={{ x: docked ? -DOCKED_OFFSET_PX : 0 }}
      transition={{ duration: 0.4, ease }}
    >
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
        {open && (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder={placeholder}
                className="min-w-0 flex-1 bg-transparent px-5 text-[15px] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
              />
              <button
                type="button"
                onClick={handleSend}
                className={cn(
                  "shrink-0 px-5 text-[13px] font-medium transition-colors duration-200",
                  query.trim()
                    ? "text-[var(--color-glacier)] hover:text-[var(--color-aurora)]"
                    : "text-[var(--color-pumice)]"
                )}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
