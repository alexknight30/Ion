export type TextLine =
  | { kind: "text"; content: string; indent?: number }
  | { kind: "checklist"; content: string; checked: boolean; indent?: number };

export const INDENT_SPACES = 2;
export const MAX_INDENT = 8;

const CHECKLIST_LINE_PATTERN = /^(\s*)\[( |x)\] (.*)$/i;
const BULLET_PATTERN = /^(\s*)-\s+(.*)$/;

export function isBulletTextLine(line: TextLine): boolean {
  return line.kind === "text" && BULLET_PATTERN.test(line.content);
}

export function canIndentLine(line: TextLine): boolean {
  return line.kind === "checklist" || isBulletTextLine(line);
}

function getBulletParts(content: string) {
  const match = content.match(BULLET_PATTERN);
  if (!match) return null;
  return {
    spaces: match[1],
    text: match[2],
  };
}

export function indentLine(line: TextLine): TextLine {
  if (line.kind === "checklist") {
    const indent = Math.min(MAX_INDENT, (line.indent ?? 0) + 1);
    return { ...line, indent };
  }

  if (isBulletTextLine(line)) {
    const parts = getBulletParts(line.content);
    if (!parts) return line;
    return {
      kind: "text",
      content: `${parts.spaces}${" ".repeat(INDENT_SPACES)}- ${parts.text}`,
    };
  }

  return line;
}

export function outdentLine(line: TextLine): TextLine {
  if (line.kind === "checklist") {
    const indent = Math.max(0, (line.indent ?? 0) - 1);
    return { ...line, indent };
  }

  if (isBulletTextLine(line)) {
    const parts = getBulletParts(line.content);
    if (!parts || parts.spaces.length < INDENT_SPACES) {
      return line;
    }

    return {
      kind: "text",
      content: `${parts.spaces.slice(INDENT_SPACES)}- ${parts.text}`,
    };
  }

  return line;
}

export function indentLineRange(
  lines: TextLine[],
  startLine: number,
  endLine: number
): TextLine[] {
  return lines.map((line, index) => {
    if (index < startLine || index > endLine || !canIndentLine(line)) {
      return line;
    }

    return indentLine(line);
  });
}

export function outdentLineRange(
  lines: TextLine[],
  startLine: number,
  endLine: number
): TextLine[] {
  return lines.map((line, index) => {
    if (index < startLine || index > endLine || !canIndentLine(line)) {
      return line;
    }

    return outdentLine(line);
  });
}

export function parseTextArtifactContent(raw: string): TextLine[] {
  if (!raw) {
    return [{ kind: "text", content: "" }];
  }

  return raw.split("\n").map((line) => {
    const checklistMatch = line.match(CHECKLIST_LINE_PATTERN);
    if (checklistMatch) {
      return {
        kind: "checklist",
        content: checklistMatch[3],
        checked: checklistMatch[2].toLowerCase() === "x",
        indent: Math.floor(checklistMatch[1].length / INDENT_SPACES),
      };
    }

    return { kind: "text", content: line };
  });
}

export function serializeTextArtifactContent(lines: TextLine[]): string {
  return lines
    .map((line) => {
      if (line.kind === "checklist") {
        const prefix = " ".repeat((line.indent ?? 0) * INDENT_SPACES);
        return line.checked
          ? `${prefix}[x] ${line.content}`
          : `${prefix}[ ] ${line.content}`;
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
    return { kind: "text", content: "", indent: line.indent };
  }

  const prefix = " ".repeat((line.indent ?? 0) * INDENT_SPACES);
  return {
    kind: "text",
    content: `${prefix}- ${line.content}`,
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
      indent: Math.floor(bulletMatch[1].length / INDENT_SPACES),
    };
  }

  if (line.content.trim() === "") {
    return line;
  }

  return {
    kind: "checklist",
    content: line.content,
    checked: false,
    indent: line.indent,
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
  const inheritedIndent =
    current?.kind === "checklist" ? current.indent ?? 0 : current?.indent ?? 0;

  if (!current || (current.kind === "text" && current.content.trim() === "")) {
    next[lineIndex] = {
      kind: "checklist",
      content: "",
      checked: false,
      indent: inheritedIndent,
    };
    return { lines: next, focusLineIndex: lineIndex };
  }

  next.splice(lineIndex + 1, 0, {
    kind: "checklist",
    content: "",
    checked: false,
    indent: current.kind === "checklist" ? current.indent ?? 0 : inheritedIndent,
  });

  return { lines: next, focusLineIndex: lineIndex + 1 };
}

export function exitChecklistLine(lines: TextLine[], lineIndex: number): {
  lines: TextLine[];
  focusLineIndex: number;
} {
  const next = [...lines];
  const current = next[lineIndex];

  if (!current || current.kind !== "checklist") {
    return { lines, focusLineIndex: lineIndex };
  }

  next[lineIndex] = { kind: "text", content: "", indent: current.indent };
  return { lines: next, focusLineIndex: lineIndex };
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
