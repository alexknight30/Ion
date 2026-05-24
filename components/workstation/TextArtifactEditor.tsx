"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import {
  canIndentLine,
  exitChecklistLine,
  getFocusedLineIndex,
  getSelectionLineRange,
  indentLineRange,
  insertChecklistLine,
  outdentLineRange,
  parseTextArtifactContent,
  serializeTextArtifactContent,
  toggleLinesChecklist,
  type TextLine,
} from "@/lib/checklist-text";
import { isChecklistShortcut } from "@/lib/checklist-shortcut";
import { applyTextSubstitutions } from "@/lib/text-substitutions";

interface TextArtifactEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export interface TextArtifactEditorHandle {
  insertChecklist: () => void;
}

const LINE_CLASS =
  "text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]";
const CHECKLIST_TEXT_CLASS =
  "min-h-[1.6em] min-w-[2px] flex-1 whitespace-pre-wrap break-words outline-none";
const CHECKLIST_ROW_CLASS = "flex items-start gap-2";
const INDENT_PADDING_PX = 16;

function getChecklistIndentPadding(line: TextLine) {
  if (line.kind !== "checklist") {
    return 0;
  }

  return (line.indent ?? 0) * INDENT_PADDING_PX;
}

function createBubbleElement(checked: boolean) {
  const bubble = document.createElement("span");
  bubble.setAttribute("contenteditable", "false");
  bubble.setAttribute("data-checklist-bubble", "true");
  bubble.setAttribute("role", "button");
  bubble.setAttribute("aria-label", checked ? "Mark incomplete" : "Mark complete");
  bubble.className =
    "mt-[3px] flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center";

  const circle = document.createElement("span");
  circle.className = checked
    ? "flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-[var(--color-glacier)] bg-[var(--color-glacier)]"
    : "flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-[var(--color-pumice)] bg-transparent";

  if (checked) {
    const dot = document.createElement("span");
    dot.className = "h-1.5 w-1.5 rounded-full bg-[var(--color-obsidian)]";
    circle.appendChild(dot);
  }

  bubble.appendChild(circle);
  return bubble;
}

function getChecklistTextClass(checked: boolean) {
  return cn(
    CHECKLIST_TEXT_CLASS,
    LINE_CLASS,
    checked &&
      "text-[var(--color-pumice)] line-through decoration-[var(--color-pumice)]"
  );
}

function setChecklistTextContent(text: HTMLElement, content: string) {
  text.textContent = "";

  if (content) {
    text.textContent = content;
    return;
  }

  const placeholder = document.createElement("br");
  placeholder.setAttribute("data-checklist-placeholder", "true");
  text.appendChild(placeholder);
}

function readChecklistTextContent(text: HTMLElement | null) {
  if (!text) return "";
  return (text.textContent ?? "").replace(/\u200B/g, "");
}

function ensureChecklistTextPlaceholder(row: HTMLElement) {
  if (row.getAttribute("data-line-kind") !== "checklist") {
    return;
  }

  const text = row.querySelector("[data-line-text]");
  if (!(text instanceof HTMLElement)) {
    return;
  }

  if (readChecklistTextContent(text) === "" && !text.querySelector("br")) {
    setChecklistTextContent(text, "");
  }
}

function renderLinesToEditor(root: HTMLElement, lines: TextLine[]) {
  root.innerHTML = "";

  lines.forEach((line, index) => {
    if (line.kind === "checklist") {
      const row = document.createElement("div");
      row.setAttribute("data-line-index", String(index));
      row.setAttribute("data-line-kind", "checklist");
      row.setAttribute("data-checked", String(line.checked));
      row.setAttribute("data-line-indent", String(line.indent ?? 0));
      row.className = cn(CHECKLIST_ROW_CLASS, index < lines.length - 1 && "mb-1.5");
      row.style.paddingLeft = `${getChecklistIndentPadding(line)}px`;

      const text = document.createElement("span");
      text.setAttribute("data-line-text", "true");
      text.className = getChecklistTextClass(line.checked);
      setChecklistTextContent(text, line.content);

      row.appendChild(createBubbleElement(line.checked));
      row.appendChild(text);
      root.appendChild(row);
      return;
    }

    const row = document.createElement("div");
    row.setAttribute("data-line-index", String(index));
    row.setAttribute("data-line-kind", "text");
    row.className = cn(LINE_CLASS, "whitespace-pre-wrap break-words", index < lines.length - 1 && "mb-1.5");

    if (line.content) {
      row.textContent = line.content;
    } else {
      row.appendChild(document.createElement("br"));
    }

    root.appendChild(row);
  });
}

function parseEditorDom(root: HTMLElement): TextLine[] {
  const parsed = Array.from(root.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map((child) => {
      const kind = child.getAttribute("data-line-kind");

      if (kind === "checklist") {
        return {
          kind: "checklist" as const,
          checked: child.getAttribute("data-checked") === "true",
          indent: Number(child.getAttribute("data-line-indent") ?? 0),
          content: readChecklistTextContent(
            child.querySelector("[data-line-text]")
          ),
        };
      }

      return {
        kind: "text" as const,
        content: child.textContent ?? "",
      };
    });

  return parsed.length > 0 ? parsed : [{ kind: "text", content: "" }];
}

function getLineTextElement(row: HTMLElement) {
  if (row.getAttribute("data-line-kind") === "checklist") {
    return row.querySelector("[data-line-text]");
  }

  return row;
}

function getCaretLineIndex(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const anchor = selection.anchorNode;
  const element =
    anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
  const row = element?.closest("[data-line-index]");

  if (!row || !root.contains(row)) {
    return 0;
  }

  const index = Number(row.getAttribute("data-line-index"));
  return Number.isNaN(index) ? 0 : index;
}

function getCaretOffsetInLine(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const anchor = selection.anchorNode;
  const element =
    anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
  const row = element?.closest("[data-line-index]");

  if (!(row instanceof HTMLElement) || !root.contains(row)) {
    return 0;
  }

  const textElement = getLineTextElement(row);
  if (!(textElement instanceof HTMLElement)) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  if (!textElement.contains(range.startContainer)) {
    return textElement.textContent?.length ?? 0;
  }

  const preRange = range.cloneRange();
  preRange.selectNodeContents(textElement);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function placeCaretInLine(root: HTMLElement, lineIndex: number, offset = 0) {
  const row = root.querySelector(`[data-line-index="${lineIndex}"]`);
  if (!(row instanceof HTMLElement)) return;

  const textElement = getLineTextElement(row);
  if (!(textElement instanceof HTMLElement)) return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const textNode = textElement.firstChild;
  const length = textElement.textContent?.length ?? 0;
  const safeOffset = Math.min(offset, length);

  if (textNode?.nodeType === Node.TEXT_NODE) {
    range.setStart(textNode, safeOffset);
  } else if (textElement.querySelector("[data-checklist-placeholder]")) {
    range.setStartBefore(textElement.firstChild!);
  } else if (length === 0) {
    range.setStart(textElement, 0);
  } else {
    range.setStart(textElement, 0);
  }

  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectLineRange(root: HTMLElement, startLine: number, endLine: number) {
  const normalizedStart = Math.min(startLine, endLine);
  const normalizedEnd = Math.max(startLine, endLine);

  const startRow = root.querySelector(
    `[data-line-index="${normalizedStart}"]`
  );
  const endRow = root.querySelector(`[data-line-index="${normalizedEnd}"]`);

  if (!(startRow instanceof HTMLElement) || !(endRow instanceof HTMLElement)) {
    return;
  }

  const startText = getLineTextElement(startRow);
  const endText = getLineTextElement(endRow);

  if (!(startText instanceof HTMLElement) || !(endText instanceof HTMLElement)) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const startNode = startText.firstChild;
  const endNode = endText.firstChild;
  const endLength = endText.textContent?.length ?? 0;

  if (startNode?.nodeType === Node.TEXT_NODE) {
    range.setStart(startNode, 0);
  } else {
    range.setStart(startText, 0);
  }

  if (endNode?.nodeType === Node.TEXT_NODE) {
    range.setEnd(endNode, endLength);
  } else {
    range.setEnd(endText, endText.childNodes.length);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function applySubstitutionsAtCaret(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const anchor = selection.anchorNode;
  const element =
    anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
  const row = element?.closest("[data-line-index]");

  if (!(row instanceof HTMLElement) || !root.contains(row)) {
    return;
  }

  const textElement = getLineTextElement(row);
  if (!(textElement instanceof HTMLElement)) {
    return;
  }

  const raw = readChecklistTextContent(textElement);
  const offset = getCaretOffsetInLine(root);
  const { value, cursor } = applyTextSubstitutions(raw, offset);

  if (value === raw) {
    return;
  }

  setChecklistTextContent(textElement, value);
  const lineIndex = Number(row.getAttribute("data-line-index"));
  if (!Number.isNaN(lineIndex)) {
    placeCaretInLine(root, lineIndex, cursor);
  }
}

function normalizeLineAttributes(root: HTMLElement) {
  Array.from(root.children).forEach((child, index) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }

    if (!child.getAttribute("data-line-kind")) {
      child.setAttribute("data-line-kind", "text");
      child.className = cn(
        LINE_CLASS,
        "whitespace-pre-wrap break-words",
        index < root.childElementCount - 1 && "mb-1.5"
      );
    }

    child.setAttribute("data-line-index", String(index));
    ensureChecklistTextPlaceholder(child);
  });
}

function updateChecklistRowVisual(row: HTMLElement, checked: boolean) {
  row.setAttribute("data-checked", String(checked));

  const text = row.querySelector("[data-line-text]");
  if (text instanceof HTMLElement) {
    text.className = getChecklistTextClass(checked);
  }

  const bubble = row.querySelector("[data-checklist-bubble]");
  if (bubble) {
    const nextBubble = createBubbleElement(checked);
    bubble.replaceWith(nextBubble);
  }
}

function shouldHandleChecklistShortcut(root: HTMLElement) {
  const active = document.activeElement;
  if (active instanceof Node && root.contains(active)) {
    return true;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  return root.contains(selection.getRangeAt(0).commonAncestorContainer);
}

function hasNonCollapsedSelection(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }

  return root.contains(selection.getRangeAt(0).commonAncestorContainer);
}

function isUndoShortcut(event: ReactKeyboardEvent | globalThis.KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    event.key.toLowerCase() === "z"
  );
}

export const TextArtifactEditor = forwardRef<
  TextArtifactEditorHandle,
  TextArtifactEditorProps
>(function TextArtifactEditor({ content, onContentChange }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const isLocalEditRef = useRef(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const recordUndo = useCallback(() => {
    const current = contentRef.current;
    if (undoStackRef.current.at(-1) === current) {
      return;
    }

    undoStackRef.current.push(current);
    if (undoStackRef.current.length > 100) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const applySerializedContent = useCallback(
    (
      serialized: string,
      focusLineIndex?: number,
      focusOffset?: number,
      selectionLineRange?: { startLine: number; endLine: number }
    ) => {
      contentRef.current = serialized;
      onContentChange(serialized);

      const root = editorRef.current;
      if (!root) return;

      isLocalEditRef.current = true;
      renderLinesToEditor(root, parseTextArtifactContent(serialized));

      if (selectionLineRange) {
        requestAnimationFrame(() => {
          root.focus();
          selectLineRange(
            root,
            selectionLineRange.startLine,
            selectionLineRange.endLine
          );
        });
        return;
      }

      if (focusLineIndex !== undefined) {
        requestAnimationFrame(() => {
          root.focus();
          placeCaretInLine(root, focusLineIndex, focusOffset ?? 0);
        });
      }
    },
    [onContentChange]
  );

  const commit = useCallback(
    (
      lines: TextLine[],
      focusLineIndex?: number,
      focusOffset?: number,
      selectionLineRange?: { startLine: number; endLine: number }
    ) => {
      recordUndo();
      applySerializedContent(
        serializeTextArtifactContent(lines),
        focusLineIndex,
        focusOffset,
        selectionLineRange
      );
    },
    [applySerializedContent, recordUndo]
  );

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (previous === undefined) {
      return false;
    }

    redoStackRef.current.push(contentRef.current);
    applySerializedContent(previous);
    return true;
  }, [applySerializedContent]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next === undefined) {
      return false;
    }

    undoStackRef.current.push(contentRef.current);
    applySerializedContent(next);
    return true;
  }, [applySerializedContent]);

  const syncFromDom = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;

    applySubstitutionsAtCaret(root);
    normalizeLineAttributes(root);
    const lines = parseEditorDom(root);
    const serialized = serializeTextArtifactContent(lines);
    contentRef.current = serialized;
    isLocalEditRef.current = true;
    onContentChange(serialized);
  }, [onContentChange]);

  const insertChecklist = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;

    const currentLines = parseEditorDom(root);
    const selectionRange = getSelectionLineRange(root);

    if (selectionRange) {
      const next = toggleLinesChecklist(
        currentLines,
        selectionRange.startLine,
        selectionRange.endLine
      );
      commit(next, undefined, undefined, selectionRange);
      return;
    }

    const lineIndex = getFocusedLineIndex(root);
    const current = currentLines[lineIndex];

    if (current?.kind === "checklist") {
      commit(toggleLinesChecklist(currentLines, lineIndex, lineIndex), lineIndex);
      return;
    }

    if (current?.kind === "text" && current.content.trim() === "") {
      const { lines: nextLines, focusLineIndex } = insertChecklistLine(
        currentLines,
        lineIndex
      );
      commit(nextLines, focusLineIndex);
      return;
    }

    commit(toggleLinesChecklist(currentLines, lineIndex, lineIndex), lineIndex);
  }, [commit]);

  useImperativeHandle(ref, () => ({ insertChecklist }), [insertChecklist]);

  useEffect(() => {
    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (!isChecklistShortcut(event)) {
        return;
      }

      const root = editorRef.current;
      if (!root?.isConnected || !shouldHandleChecklistShortcut(root)) {
        return;
      }

      event.preventDefault();
      insertChecklist();
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [insertChecklist]);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;

    if (isLocalEditRef.current) {
      isLocalEditRef.current = false;
      return;
    }

    if (content === contentRef.current && root.childElementCount > 0) {
      return;
    }

    if (
      root.contains(document.activeElement) &&
      content !== contentRef.current
    ) {
      return;
    }

    contentRef.current = content;
    undoStackRef.current = [];
    redoStackRef.current = [];
    renderLinesToEditor(root, parseTextArtifactContent(content));
  }, [content]);

  function handleInput() {
    recordUndo();
    syncFromDom();
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const root = editorRef.current;
    if (!root) return;

    const bubble = target.closest("[data-checklist-bubble]");
    const bubbleRow = bubble?.closest("[data-line-index]");

    if (
      bubble &&
      bubbleRow instanceof HTMLElement &&
      root.contains(bubbleRow) &&
      bubbleRow.getAttribute("data-line-kind") === "checklist"
    ) {
      event.preventDefault();

      recordUndo();
      const checked = bubbleRow.getAttribute("data-checked") === "true";
      updateChecklistRowVisual(bubbleRow, !checked);
      syncFromDom();
      return;
    }

    const row = target.closest("[data-line-kind='checklist'][data-line-index]");
    if (!(row instanceof HTMLElement) || !root.contains(row)) {
      return;
    }

    const textElement = getLineTextElement(row);
    if (!(textElement instanceof HTMLElement)) {
      return;
    }

    if (textElement.contains(target) || target === textElement) {
      return;
    }

    const lineIndex = Number(row.getAttribute("data-line-index"));
    if (Number.isNaN(lineIndex)) {
      return;
    }

    requestAnimationFrame(() => {
      root.focus();
      placeCaretInLine(root, lineIndex, readChecklistTextContent(textElement).length);
    });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const root = editorRef.current;
    if (!root) return;

    if (isUndoShortcut(event.nativeEvent)) {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (isChecklistShortcut(event.nativeEvent)) {
      event.preventDefault();
      insertChecklist();
      return;
    }

    if (event.key === "Tab") {
      const lineIndex = getCaretLineIndex(root);
      const selectionRange = getSelectionLineRange(root);
      const startLine = selectionRange?.startLine ?? lineIndex;
      const endLine = selectionRange?.endLine ?? lineIndex;
      const lines = parseEditorDom(root);
      const hasIndentableLines = lines
        .slice(startLine, endLine + 1)
        .some(canIndentLine);

      if (!hasIndentableLines) {
        return;
      }

      event.preventDefault();

      const next = event.shiftKey
        ? outdentLineRange(lines, startLine, endLine)
        : indentLineRange(lines, startLine, endLine);

      commit(
        next,
        lineIndex,
        getCaretOffsetInLine(root),
        selectionRange ?? undefined
      );
      return;
    }

    if (event.key === "Enter") {
      const lineIndex = getCaretLineIndex(root);
      const lines = parseEditorDom(root);
      const current = lines[lineIndex];

      if (current?.kind === "checklist") {
        event.preventDefault();
        const offset = getCaretOffsetInLine(root);

        if (current.content.trim() === "") {
          const { lines: nextLines, focusLineIndex } = exitChecklistLine(
            lines,
            lineIndex
          );
          commit(nextLines, focusLineIndex);
          return;
        }

        const before = current.content.slice(0, offset);
        const after = current.content.slice(offset);
        const indent = current.indent ?? 0;
        const next = [...lines];

        if (offset === 0) {
          next.splice(lineIndex, 0, {
            kind: "checklist",
            content: "",
            checked: false,
            indent,
          });
          commit(next, lineIndex);
          return;
        }

        next[lineIndex] = { ...current, content: before };
        next.splice(lineIndex + 1, 0, {
          kind: "checklist",
          content: after,
          checked: false,
          indent,
        });
        commit(next, lineIndex + 1, 0);
      }

      return;
    }

    if (event.key === "Backspace") {
      if (hasNonCollapsedSelection(root)) {
        return;
      }

      const lineIndex = getCaretLineIndex(root);
      const offset = getCaretOffsetInLine(root);
      const lines = parseEditorDom(root);
      const current = lines[lineIndex];

      if (
        current?.kind === "checklist" &&
        current.content.trim() === "" &&
        offset === 0
      ) {
        event.preventDefault();

        if (lines.length === 1) {
          commit([{ kind: "text", content: "" }], 0);
          return;
        }

        const next = lines.filter((_, index) => index !== lineIndex);
        const focusIndex = Math.min(lineIndex, next.length - 1);
        const focusLine = next[focusIndex];
        commit(next, focusIndex, focusLine?.content.length ?? 0);
        return;
      }

      if (offset === 0 && lineIndex > 0) {
        event.preventDefault();
        const previous = lines[lineIndex - 1];
        const mergedContent = `${previous.content}${current.content}`;
        const focusOffset = previous.content.length;

        const next = [...lines];
        next[lineIndex - 1] = { ...previous, content: mergedContent };
        next.splice(lineIndex, 1);
        commit(next, lineIndex - 1, focusOffset);
      }
    }
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      onInput={handleInput}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words outline-none"
    />
  );
});
