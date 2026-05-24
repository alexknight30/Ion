"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

const INLINE_MARKDOWN_PATTERN =
  /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*/g;

export function parseInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_MARKDOWN_PATTERN.lastIndex = 0;

  while ((match = INLINE_MARKDOWN_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          <em className="italic">{match[1]}</em>
        </strong>
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[var(--color-pumice)]" />
  );
}

interface FormattedTextProps {
  content: string;
  className?: string;
  streaming?: boolean;
}

export function FormattedText({
  content,
  className,
  streaming = false,
}: FormattedTextProps) {
  const lines = content.split("\n");

  if (lines.length === 0 || (lines.length === 1 && lines[0] === "" && !streaming)) {
    return streaming ? (
      <div className={className}>
        <StreamingCursor />
      </div>
    ) : null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {lines.map((line, index) => (
        <p key={index}>
          {line ? parseInlineMarkdown(line) : "\u00A0"}
          {streaming && index === lines.length - 1 ? <StreamingCursor /> : null}
        </p>
      ))}
    </div>
  );
}
