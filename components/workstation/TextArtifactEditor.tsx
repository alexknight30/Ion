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
  getFocusedLineIndex,
  getSelectionLineRange,
  insertChecklistLine,
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
  "min-w-0 flex-1 whitespace-pre-wrap break-words outline-none";
const CHECKLIST_ROW_CLASS = "flex items-start gap-2";

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

function renderLinesToEditor(root: HTMLElement, lines: TextLine[]) {
  root.innerHTML = "";

  lines.forEach((line, index) => {
    if (line.kind === "checklist") {
      const row = document.createElement("div");
      row.setAttribute("data-line-index", String(index));
      row.setAttribute("data-line-kind", "checklist");
      row.setAttribute("data-checked", String(line.checked));
      row.className = cn(CHECKLIST_ROW_CLASS, index < lines.length - 1 && "mb-1.5");

      const text = document.createElement("span");
      text.setAttribute("data-line-text", "true");
      text.className = getChecklistTextClass(line.checked);
      text.textContent = line.content;

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
          content: child.querySelector("[data-line-text]")?.textContent ?? "",
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
  } else if (length === 0) {
    range.setStart(textElement, 0);
  } else {
    range.setStart(textElement, 0);
  }

  range.collapse(true);
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

  const raw = textElement.textContent ?? "";
  const offset = getCaretOffsetInLine(root);
  const { value, cursor } = applyTextSubstitutions(raw, offset);

  if (value === raw) {
    return;
  }

  textElement.textContent = value;
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

export const TextArtifactEditor = forwardRef<
  TextArtifactEditorHandle,
  TextArtifactEditorProps
>(function TextArtifactEditor({ content, onContentChange }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const isLocalEditRef = useRef(false);

  const commit = useCallback(
    (lines: TextLine[], focusLineIndex?: number, focusOffset?: number) => {
      const serialized = serializeTextArtifactContent(lines);
      contentRef.current = serialized;
      onContentChange(serialized);

      const root = editorRef.current;
      if (!root) return;

      isLocalEditRef.current = true;
      renderLinesToEditor(root, lines);

      if (focusLineIndex !== undefined) {
        requestAnimationFrame(() => {
          root.focus();
          placeCaretInLine(root, focusLineIndex, focusOffset ?? 0);
        });
      }
    },
    [onContentChange]
  );

  const syncFromDom = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;

    applySubstitutionsAtCaret(root);
    normalizeLineAttributes(root);
    const lines = parseEditorDom(root);
    const serialized = serializeTextArtifactContent(lines);
    contentRef.current = serialized;
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
      commit(next, selectionRange.endLine);
      window.getSelection()?.removeAllRanges();
      return;
    }

    const lineIndex = getFocusedLineIndex(root);
    const { lines: nextLines, focusLineIndex } = insertChecklistLine(
      currentLines,
      lineIndex
    );
    commit(nextLines, focusLineIndex);
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

    contentRef.current = content;
    renderLinesToEditor(root, parseTextArtifactContent(content));
  }, [content]);

  function handleInput() {
    syncFromDom();
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const bubble = target.closest("[data-checklist-bubble]");
    const row = bubble?.closest("[data-line-index]");

    if (!(row instanceof HTMLElement) || !editorRef.current?.contains(row)) {
      return;
    }

    if (row.getAttribute("data-line-kind") !== "checklist") {
      return;
    }

    event.preventDefault();

    const checked = row.getAttribute("data-checked") === "true";
    updateChecklistRowVisual(row, !checked);
    syncFromDom();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const root = editorRef.current;
    if (!root) return;

    if (isChecklistShortcut(event.nativeEvent)) {
      event.preventDefault();
      insertChecklist();
      return;
    }

    if (event.key === "Enter") {
      const lineIndex = getCaretLineIndex(root);
      const lines = parseEditorDom(root);
      const current = lines[lineIndex];

      if (current?.kind === "checklist") {
        event.preventDefault();
        const next = [...lines];
        next.splice(lineIndex + 1, 0, {
          kind: "checklist",
          content: "",
          checked: false,
        });
        commit(next, lineIndex + 1);
      }

      return;
    }

    if (event.key === "Backspace") {
      const lineIndex = getCaretLineIndex(root);
      const offset = getCaretOffsetInLine(root);

      if (offset === 0 && lineIndex > 0) {
        event.preventDefault();
        const lines = parseEditorDom(root);
        const previous = lines[lineIndex - 1];
        const current = lines[lineIndex];
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
