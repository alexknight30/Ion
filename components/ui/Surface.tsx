"use client";

import { motion } from "framer-motion";
import { reveal } from "@/lib/variants";
import { cn } from "@/lib/cn";

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  style?: React.CSSProperties;
}

export function Surface({ children, className, index = 0, style }: SurfaceProps) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      animate="visible"
      custom={index}
      style={style}
      className={cn(
        "rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] p-8",
        "shadow-[0_1px_3px_var(--color-shadow-soft)]",
        "min-h-0",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
