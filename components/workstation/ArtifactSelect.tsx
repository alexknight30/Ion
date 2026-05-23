"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ArtifactSelectOption } from "@/lib/artifact-select-options";

interface ArtifactSelectProps {
  options: ArtifactSelectOption[];
  value: string;
  onChange: (optionId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  dropdownDirection?: "up" | "down";
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="h-3 w-3 shrink-0" aria-hidden />;

  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function ArtifactSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select artifact",
  emptyLabel = "No artifacts",
  ariaLabel = "Select artifact",
  dropdownDirection = "up",
}: ArtifactSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.id === value);

  const displayLabel = selectedOption?.label
    ? selectedOption.label
    : options.length === 0
      ? emptyLabel
      : placeholder;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-3 py-2 text-left outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-border-active)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-50",
          !selectedOption && "text-[var(--color-pumice)]"
        )}
      >
        <span className="min-w-0 truncate text-[13px] text-[var(--color-bone)]">
          {displayLabel}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <ColorDot color={selectedOption?.color ?? null} />
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={cn(
              "text-[var(--color-pumice)] transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </span>
      </button>

      {open && options.length > 0 && (
        <ul
          role="listbox"
          aria-label="Artifacts"
          className={cn(
            "absolute left-0 right-0 z-20 max-h-48 overflow-y-auto rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]",
            dropdownDirection === "up"
              ? "bottom-[calc(100%+4px)]"
              : "top-[calc(100%+4px)]"
          )}
        >
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <li key={option.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]",
                    selected && "bg-[var(--color-ash)]"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] tracking-[-0.01em] text-[var(--color-bone)]">
                      {option.label}
                    </span>
                    <span className="block truncate text-[12px] tracking-[-0.01em] text-[var(--color-pumice)]">
                      {option.subtitle}
                    </span>
                  </span>
                  <ColorDot color={option.color} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
