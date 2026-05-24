"use client";

import { Fragment, type ReactNode } from "react";
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

function renderParagraphLines(text: string) {
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {line ? parseInlineMarkdown(line) : null}
    </Fragment>
  ));
}

type ParagraphSegment =
  | { kind: "text"; lines: string[] }
  | { kind: "list"; items: string[] };

function splitParagraphSegments(text: string): ParagraphSegment[] {
  const segments: ParagraphSegment[] = [];

  for (const line of text.split("\n")) {
    const bulletMatch = line.match(/^-\s+(.*)$/);

    if (bulletMatch) {
      const last = segments[segments.length - 1];
      if (last?.kind === "list") {
        last.items.push(bulletMatch[1]);
      } else {
        segments.push({ kind: "list", items: [bulletMatch[1]] });
      }
      continue;
    }

    const last = segments[segments.length - 1];
    if (last?.kind === "text") {
      last.lines.push(line);
    } else {
      segments.push({ kind: "text", lines: [line] });
    }
  }

  return segments;
}

function renderParagraphBlock(text: string, renderBulletLists: boolean) {
  if (!renderBulletLists) {
    return renderParagraphLines(text);
  }

  const segments = splitParagraphSegments(text);

  return segments.map((segment, index) => {
    if (segment.kind === "list") {
      return (
        <ul
          key={`list-${index}`}
          className="list-disc space-y-1 pl-5 marker:text-[var(--color-pumice)]"
        >
          {segment.items.map((item, itemIndex) => (
            <li key={itemIndex}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }

    const joined = segment.lines.join("\n");
    if (!joined.trim()) {
      return segment.lines.length > 1 ? (
        <Fragment key={`text-${index}`}>
          {renderParagraphLines(joined)}
        </Fragment>
      ) : null;
    }

    return (
      <Fragment key={`text-${index}`}>{renderParagraphLines(joined)}</Fragment>
    );
  });
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
  renderBulletLists?: boolean;
}

export function FormattedText({
  content,
  className,
  streaming = false,
  renderBulletLists = false,
}: FormattedTextProps) {
  const paragraphs = content.split(/\n{2,}/);

  if (
    paragraphs.length === 0 ||
    (paragraphs.length === 1 && paragraphs[0] === "" && !streaming)
  ) {
    return streaming ? (
      <div className={className}>
        <StreamingCursor />
      </div>
    ) : null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((paragraph, index) => (
        <div key={index} className="space-y-2">
          {paragraph ? renderParagraphBlock(paragraph, renderBulletLists) : "\u00A0"}
          {streaming && index === paragraphs.length - 1 ? (
            <StreamingCursor />
          ) : null}
        </div>
      ))}
    </div>
  );
}
