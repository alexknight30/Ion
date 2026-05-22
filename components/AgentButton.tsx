"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

export function AgentButton() {
  // TODO: wire up agent
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease }}
      aria-label="Agent"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-active)] bg-[var(--color-obsidian)] shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)] transition-shadow duration-200 hover:shadow-[0_4px_24px_var(--color-shadow-hover),0_0_0_1px_var(--color-border-active)]"
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
  );
}
