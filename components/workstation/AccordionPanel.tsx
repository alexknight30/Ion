"use client";

import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

interface AccordionPanelProps {
  label: string;
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
  scrollContent?: boolean;
  expandSize?: "fill" | "limited";
  className?: string;
}

export function AccordionPanel({
  label,
  index = 0,
  isOpen,
  onToggle,
  headerAction,
  children,
  scrollContent = true,
  expandSize = "fill",
  className,
}: AccordionPanelProps) {
  return (
    <Surface
      index={index}
      className={cn(
        "flex flex-col overflow-hidden !p-0 transition-shadow duration-200",
        isOpen
          ? expandSize === "fill"
            ? "min-h-0 flex-1"
            : "mb-20 min-h-0 flex-1"
          : "shrink-0",
        !isOpen && "hover:shadow-[0_4px_24px_var(--color-shadow-hover)]",
        className
      )}
    >
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center px-4 py-4 text-left"
        >
          <Label>{label}</Label>
        </button>
        {headerAction && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {headerAction}
          </div>
        )}
      </div>
      <div
        className={cn(
          "grid min-h-0 px-4 pb-4 transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isOpen ? "flex-1 grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "flex h-full min-h-0 flex-col",
              scrollContent ? "overflow-y-auto" : "overflow-hidden",
              !isOpen && "invisible opacity-0"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </Surface>
  );
}
