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

const ACCORDION_EASE = "cubic-bezier(0.16,1,0.3,1)";
const ACCORDION_DURATION: Record<"fill" | "limited", string> = {
  limited: "1200ms",
  fill: "1800ms",
};

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
        "flex flex-col overflow-hidden !p-0 motion-reduce:transition-none",
        isOpen
          ? expandSize === "fill"
            ? "min-h-0 flex-1 max-h-full"
            : "mb-20 min-h-0 flex-1 max-h-full"
          : "max-h-[3.25rem] shrink-0",
        !isOpen && "hover:shadow-[0_4px_24px_var(--color-shadow-hover)]",
        className
      )}
    >
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center px-4 py-3 text-left"
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
          "grid min-h-0 motion-reduce:transition-none",
          isOpen ? "min-h-0 flex-1 grid-rows-[1fr] px-4 pb-4" : "grid-rows-[0fr]"
        )}
        style={{
          transitionProperty: "grid-template-rows",
          transitionDuration: ACCORDION_DURATION[expandSize],
          transitionTimingFunction: ACCORDION_EASE,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "flex min-h-0 flex-col",
              isOpen && "min-h-0 flex-1",
              isOpen && scrollContent && "overflow-y-auto"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </Surface>
  );
}
