export type TextLine =
  | { kind: "text"; content: string }
  | { kind: "checklist"; content: string; checked: boolean };

const CHECKLIST_CHECKED_PATTERN = /^\[x\] (.*)$/i;
const CHECKLIST_UNCHECKED_PATTERN = /^\[ \] (.*)$/;
const BULLET_PATTERN = /^(\s*)-\s+(.*)$/;

export function parseTextArtifactContent(raw: string): TextLine[] {
  if (!raw) {
    return [{ kind: "text", content: "" }];
  }

  return raw.split("\n").map((line) => {
    const checkedMatch = line.match(CHECKLIST_CHECKED_PATTERN);
    if (checkedMatch) {
      return {
        kind: "checklist",
        content: checkedMatch[1],
        checked: true,
      };
    }

    const uncheckedMatch = line.match(CHECKLIST_UNCHECKED_PATTERN);
    if (uncheckedMatch) {
      return {
        kind: "checklist",
        content: uncheckedMatch[1],
        checked: false,
      };
    }

    return { kind: "text", content: line };
  });
}

export function serializeTextArtifactContent(lines: TextLine[]): string {
  return lines
    .map((line) => {
      if (line.kind === "checklist") {
        return line.checked ? `[x] ${line.content}` : `[ ] ${line.content}`;
      }

      return line.content;
    })
    .join("\n");
}

export function convertLineToText(line: TextLine): TextLine {
  if (line.kind === "text") {
    return line;
  }

  if (line.content.trim() === "") {
    return { kind: "text", content: "" };
  }

  return {
    kind: "text",
    content: `- ${line.content}`,
  };
}

export function convertLineToChecklist(line: TextLine): TextLine {
  if (line.kind === "checklist") {
    return line;
  }

  const bulletMatch = line.content.match(BULLET_PATTERN);
  if (bulletMatch) {
    return {
      kind: "checklist",
      content: bulletMatch[2],
      checked: false,
    };
  }

  if (line.content.trim() === "") {
    return line;
  }

  return {
    kind: "checklist",
    content: line.content,
    checked: false,
  };
}

export function toggleLinesChecklist(
  lines: TextLine[],
  startLine: number,
  endLine: number
): TextLine[] {
  const selected = lines.slice(startLine, endLine + 1);
  const allChecklist = selected.every((line) => line.kind === "checklist");

  return lines.map((line, index) => {
    if (index < startLine || index > endLine) {
      return line;
    }

    if (allChecklist) {
      return convertLineToText(line);
    }

    return convertLineToChecklist(line);
  });
}

export function convertLinesToChecklist(
  lines: TextLine[],
  startLine: number,
  endLine: number
): TextLine[] {
  return lines.map((line, index) => {
    if (index < startLine || index > endLine) {
      return line;
    }

    return convertLineToChecklist(line);
  });
}

export function insertChecklistLine(lines: TextLine[], lineIndex: number): {
  lines: TextLine[];
  focusLineIndex: number;
} {
  const next = [...lines];
  const current = next[lineIndex];

  if (!current || current.kind === "text" && current.content.trim() === "") {
    next[lineIndex] = { kind: "checklist", content: "", checked: false };
    return { lines: next, focusLineIndex: lineIndex };
  }

  next.splice(lineIndex + 1, 0, {
    kind: "checklist",
    content: "",
    checked: false,
  });

  return { lines: next, focusLineIndex: lineIndex + 1 };
}

export function getSelectionLineRange(
  container: HTMLElement
): { startLine: number; endLine: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const startElement =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  const endElement =
    range.endContainer instanceof Element
      ? range.endContainer
      : range.endContainer.parentElement;

  const startRow = startElement?.closest("[data-line-index]");
  const endRow = endElement?.closest("[data-line-index]");

  if (!startRow || !endRow || !container.contains(startRow)) {
    return null;
  }

  const startLine = Number(startRow.getAttribute("data-line-index"));
  const endLine = Number(endRow.getAttribute("data-line-index"));

  if (Number.isNaN(startLine) || Number.isNaN(endLine)) {
    return null;
  }

  return {
    startLine: Math.min(startLine, endLine),
    endLine: Math.max(startLine, endLine),
  };
}

export function getFocusedLineIndex(container: HTMLElement): number {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const anchor = selection.anchorNode;
    const element =
      anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
    const row = element?.closest("[data-line-index]");

    if (row && container.contains(row)) {
      const index = Number(row.getAttribute("data-line-index"));
      if (!Number.isNaN(index)) {
        return index;
      }
    }
  }

  const active = document.activeElement;
  const row = active?.closest("[data-line-index]");

  if (row && container.contains(row)) {
    const index = Number(row.getAttribute("data-line-index"));
    if (!Number.isNaN(index)) {
      return index;
    }
  }

  return Math.max(0, container.querySelectorAll("[data-line-index]").length - 1);
}
