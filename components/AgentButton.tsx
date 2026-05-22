"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

const ease = [0.16, 1, 0.3, 1] as const;

export function AgentButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function handleSend() {
    // TODO: wire up agent
    if (!query.trim()) return;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close agent" : "Open agent"}
        aria-expanded={open}
        className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)] transition-shadow duration-200 hover:shadow-[0_4px_24px_var(--color-shadow-hover),0_0_0_1px_var(--color-border-active)]"
      >
        <Image
          src="/ion.svg"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 scale-[1.35]"
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
            <div className="flex h-16 w-[360px] items-center rounded-[12px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)]">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask Ion"
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
    </div>
  );
}
