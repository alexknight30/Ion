"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  Minus,
  Move,
  Plus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  clampZoom,
  cloneSketchDocument,
  createSketchEdge,
  deleteSketchEdge,
  deleteSketchNode,
  duplicateSketchEdge,
  getAnchorPoint,
  getCanvasCenterWorld,
  parseSketch,
  placeDuplicateNode,
  placeSketchNode,
  serializeSketch,
  SKETCH_ANCHORS,
  SKETCH_DEFAULTS,
  SKETCH_PERIMETER_DRAG_SIZE,
  type SketchAnchor,
  type SketchClipboard,
  type SketchDocument,
  type SketchEdgeKind,
  type SketchNode,
  type SketchNodeShape,
} from "@/lib/sketch";

interface SketchEditorProps {
  content: string;
  onChange: (content: string) => void;
}

interface PendingConnection {
  edgeKind: SketchEdgeKind;
  fromNodeId: string;
  fromAnchor: SketchAnchor;
}

interface DragState {
  kind: "node" | "pan" | "resize";
  nodeId?: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  originWidth?: number;
  originHeight?: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  target:
    | { type: "node"; id: string }
    | { type: "edge"; id: string };
}

const MAX_UNDO = 50;

function clientToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: SketchDocument["viewport"]
) {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  };
}

function toolButtonClass() {
  return cn(
    "flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-[12px] font-medium tracking-[-0.01em] text-[var(--color-steam)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
  );
}

function PerimeterDragStrip({
  position,
  onPointerDown,
}: {
  position: "top" | "right" | "bottom" | "left";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const size = SKETCH_PERIMETER_DRAG_SIZE;

  return (
    <div
      data-perimeter-drag
      onPointerDown={onPointerDown}
      className={cn(
        "absolute z-20 cursor-move",
        position === "top" && "left-0 right-0 top-0",
        position === "bottom" && "bottom-0 left-0 right-0",
        position === "left" && "bottom-0 left-0 top-0",
        position === "right" && "bottom-0 right-0 top-0"
      )}
      style={
        position === "top" || position === "bottom"
          ? { height: size }
          : { width: size }
      }
    />
  );
}

export function SketchEditor({ content, onChange }: SketchEditorProps) {
  const [doc, setDoc] = useState<SketchDocument>(() => parseSketch(content));
  const [connectMode, setConnectMode] = useState<SketchEdgeKind | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [panShortcutHeld, setPanShortcutHeld] = useState(false);
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textHistoryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(content);
  const historyRef = useRef<SketchDocument[]>([]);
  const historyIndexRef = useRef(-1);
  const applyingHistoryRef = useRef(false);
  const docRef = useRef(doc);
  const clipboardRef = useRef<SketchClipboard | null>(null);
  const cursorWorldRef = useRef<{ x: number; y: number } | null>(null);

  const isPanning = panMode || panShortcutHeld;
  const showAnchors = connectMode !== null || pendingConnection !== null;

  const persist = useCallback(
    (next: SketchDocument) => {
      const serialized = serializeSketch(next);
      if (serialized === lastSaved.current) return;

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        lastSaved.current = serialized;
        onChange(serialized);
      }, 500);
    },
    [onChange]
  );

  const pushHistory = useCallback((snapshot: SketchDocument) => {
    if (applyingHistoryRef.current) return;

    const cloned = cloneSketchDocument(snapshot);
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(cloned);

    if (stack.length > MAX_UNDO) {
      stack.shift();
    }

    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current -= 1;
    const previous = cloneSketchDocument(
      historyRef.current[historyIndexRef.current]
    );

    applyingHistoryRef.current = true;
    setDoc(previous);
    persist(previous);
    applyingHistoryRef.current = false;

    setPendingConnection(null);
    setConnectMode(null);
  }, [persist]);

  const updateDoc = useCallback(
    (updater: (current: SketchDocument) => SketchDocument, recordHistory = false) => {
      setDoc((current) => {
        const next = updater(current);
        persist(next);
        if (recordHistory) {
          pushHistory(next);
        }
        return next;
      });
    },
    [persist, pushHistory]
  );

  const getPasteCenter = useCallback(() => {
    if (cursorWorldRef.current) {
      return cursorWorldRef.current;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 240, y: 180 };

    return getCanvasCenterWorld(rect, docRef.current.viewport);
  }, []);

  const pasteClipboard = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard) return;

    const center = getPasteCenter();

    if (clipboard.type === "node") {
      updateDoc(
        (current) => ({
          ...current,
          nodes: [
            ...current.nodes,
            placeDuplicateNode(
              clipboard.node,
              center.x,
              center.y,
              current.nodes
            ),
          ],
        }),
        true
      );
      return;
    }

    updateDoc(
      (current) => ({
        ...current,
        edges: [...current.edges, duplicateSketchEdge(clipboard.edge)],
      }),
      true
    );
  }, [getPasteCenter, updateDoc]);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    if (content === lastSaved.current) return;
    const next = parseSketch(content);
    setDoc(next);
    lastSaved.current = content;
    historyRef.current = [cloneSketchDocument(next)];
    historyIndexRef.current = 0;
  }, [content]);

  useEffect(() => {
    const initial = parseSketch(content);
    historyRef.current = [cloneSketchDocument(initial)];
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!dragState) return;

    function handlePointerUp() {
      if (dragState?.kind === "node" || dragState?.kind === "resize") {
        pushHistory(docRef.current);
      }
      setDragState(null);
    }

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [dragState, pushHistory]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (textHistoryTimeout.current) clearTimeout(textHistoryTimeout.current);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
      ) {
        return;
      }

      if (event.altKey && event.key.toLowerCase() === "z") {
        setPanShortcutHeld(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }

      if (event.key === "Escape") {
        setConnectMode(null);
        setPendingConnection(null);
        setContextMenu(null);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "z" || !event.altKey) {
        setPanShortcutHeld(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, pasteClipboard]);

  useEffect(() => {
    if (!contextMenu) return;

    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [contextMenu]);

  function handleZoom(delta: number) {
    updateDoc((current) => ({
      ...current,
      viewport: {
        ...current.viewport,
        zoom: clampZoom(current.viewport.zoom + delta),
      },
    }));
  }

  function addShapeAtCenter(shape: SketchNodeShape) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const center = getCanvasCenterWorld(rect, doc.viewport);
    updateDoc(
      (current) => ({
        ...current,
        nodes: [
          ...current.nodes,
          placeSketchNode(shape, center.x, center.y, current.nodes),
        ],
      }),
      true
    );
    setConnectMode(null);
    setPendingConnection(null);
  }

  function trackPointerWorld(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const world = clientToWorld(clientX, clientY, rect, doc.viewport);
    cursorWorldRef.current = world;
    setCursorWorld(world);
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    setContextMenu(null);
    trackPointerWorld(event.clientX, event.clientY);

    if (isPanning) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        kind: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: doc.viewport.x,
        originY: doc.viewport.y,
      });
    }
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    trackPointerWorld(event.clientX, event.clientY);

    if (!dragState) return;

    if (dragState.kind === "pan") {
      const dx = event.clientX - dragState.startClientX;
      const dy = event.clientY - dragState.startClientY;
      updateDoc((current) => ({
        ...current,
        viewport: {
          ...current.viewport,
          x: dragState.originX + dx,
          y: dragState.originY + dy,
        },
      }));
      return;
    }

    if (dragState.kind === "node" && dragState.nodeId) {
      const dx =
        (event.clientX - dragState.startClientX) / doc.viewport.zoom;
      const dy =
        (event.clientY - dragState.startClientY) / doc.viewport.zoom;
      updateDoc((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                x: dragState.originX + dx,
                y: dragState.originY + dy,
              }
            : node
        ),
      }));
      return;
    }

    if (
      dragState.kind === "resize" &&
      dragState.nodeId &&
      dragState.originWidth !== undefined &&
      dragState.originHeight !== undefined
    ) {
      const dx =
        (event.clientX - dragState.startClientX) / doc.viewport.zoom;
      const dy =
        (event.clientY - dragState.startClientY) / doc.viewport.zoom;
      updateDoc((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                width: Math.max(
                  SKETCH_DEFAULTS.minWidth,
                  dragState.originWidth! + dx
                ),
                height: Math.max(
                  SKETCH_DEFAULTS.minHeight,
                  dragState.originHeight! + dy
                ),
              }
            : node
        ),
      }));
    }
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  }

  function handlePerimeterDragStart(
    event: React.PointerEvent<HTMLDivElement>,
    node: SketchNode
  ) {
    if (isPanning || connectMode || pendingConnection) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      kind: "node",
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: node.x,
      originY: node.y,
    });
  }

  function handleResizeStart(
    event: React.PointerEvent<HTMLButtonElement>,
    node: SketchNode
  ) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      kind: "resize",
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: node.x,
      originY: node.y,
      originWidth: node.width,
      originHeight: node.height,
    });
  }

  function handleAnchorClick(
    node: SketchNode,
    anchor: SketchAnchor,
    edgeKind: SketchEdgeKind
  ) {
    if (!pendingConnection) {
      setPendingConnection({
        edgeKind,
        fromNodeId: node.id,
        fromAnchor: anchor,
      });
      return;
    }

    if (
      pendingConnection.fromNodeId === node.id &&
      pendingConnection.fromAnchor === anchor
    ) {
      setPendingConnection(null);
      setConnectMode(null);
      return;
    }

    const edge = createSketchEdge(
      pendingConnection.edgeKind,
      pendingConnection.fromNodeId,
      pendingConnection.fromAnchor,
      node.id,
      anchor
    );

    updateDoc(
      (current) => ({
        ...current,
        edges: [...current.edges, edge],
      }),
      true
    );
    setPendingConnection(null);
    setConnectMode(null);
  }

  function handleNodeTextChange(nodeId: string, text: string) {
    updateDoc((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, text } : node
      ),
    }));

    if (textHistoryTimeout.current) {
      clearTimeout(textHistoryTimeout.current);
    }
    textHistoryTimeout.current = setTimeout(() => {
      pushHistory(docRef.current);
    }, 800);
  }

  function openContextMenu(
    event: React.MouseEvent,
    target: ContextMenuState["target"]
  ) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      target,
    });
  }

  function handleCopyTarget() {
    if (!contextMenu) return;

    if (contextMenu.target.type === "node") {
      const node = doc.nodes.find((item) => item.id === contextMenu.target.id);
      if (!node) return;
      clipboardRef.current = { type: "node", node: structuredClone(node) };
    } else {
      const edge = doc.edges.find((item) => item.id === contextMenu.target.id);
      if (!edge) return;
      clipboardRef.current = { type: "edge", edge: { ...edge } };
    }

    setContextMenu(null);
  }

  function handleDeleteTarget() {
    if (!contextMenu) return;

    if (contextMenu.target.type === "node") {
      updateDoc(
        (current) => deleteSketchNode(current, contextMenu.target.id),
        true
      );
    } else {
      updateDoc(
        (current) => deleteSketchEdge(current, contextMenu.target.id),
        true
      );
    }

    setContextMenu(null);
  }

  function armConnectMode(kind: SketchEdgeKind) {
    setConnectMode(kind);
    setPendingConnection(null);
  }

  const nodeMap = new Map(doc.nodes.map((node) => [node.id, node]));

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)]"
      onPointerMove={(event) => trackPointerWorld(event.clientX, event.clientY)}
    >
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => addShapeAtCenter("box")}
          className={toolButtonClass()}
          aria-label="Add text box"
        >
          <Square size={14} strokeWidth={1.5} />
          Txt box
        </button>
        <button
          type="button"
          onClick={() => addShapeAtCenter("bubble")}
          className={toolButtonClass()}
          aria-label="Add text bubble"
        >
          <Circle size={14} strokeWidth={1.5} />
          Txt bubble
        </button>
        <button
          type="button"
          onClick={() => armConnectMode("line")}
          className={toolButtonClass()}
          aria-label="Draw line"
        >
          <Minus size={14} strokeWidth={1.5} />
          Line
        </button>
        <button
          type="button"
          onClick={() => armConnectMode("arrow")}
          className={toolButtonClass()}
          aria-label="Draw arrow"
        >
          <ArrowRight size={14} strokeWidth={1.5} />
          Arrow
        </button>
      </div>

      {connectMode ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] px-2.5 py-1 text-[12px] text-[var(--color-pumice)]">
          Click two anchor points to draw {connectMode}
        </div>
      ) : null}

      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={cn(
          "relative h-full min-h-0 w-full touch-none select-none overflow-hidden",
          isPanning ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${doc.viewport.x}px, ${doc.viewport.y}px) scale(${doc.viewport.zoom})`,
          }}
        >
          <svg
            className="absolute left-0 top-0 overflow-visible"
            width="4000"
            height="4000"
            aria-hidden
          >
            <defs>
              <marker
                id="sketch-arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-glacier)" />
              </marker>
            </defs>
            {doc.edges.map((edge) => {
              const fromNode = nodeMap.get(edge.fromNodeId);
              const toNode = nodeMap.get(edge.toNodeId);
              if (!fromNode || !toNode) return null;

              const from = getAnchorPoint(fromNode, edge.fromAnchor);
              const to = getAnchorPoint(toNode, edge.toAnchor);

              return (
                <g key={edge.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                    onContextMenu={(event) =>
                      openContextMenu(event, { type: "edge", id: edge.id })
                    }
                  />
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="var(--color-glacier)"
                    strokeWidth={1.5}
                    pointerEvents="none"
                    markerEnd={
                      edge.kind === "arrow" ? "url(#sketch-arrowhead)" : undefined
                    }
                  />
                </g>
              );
            })}
            {pendingConnection && cursorWorld
              ? (() => {
                  const fromNode = nodeMap.get(pendingConnection.fromNodeId);
                  if (!fromNode) return null;
                  const from = getAnchorPoint(
                    fromNode,
                    pendingConnection.fromAnchor
                  );
                  return (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={cursorWorld.x}
                      y2={cursorWorld.y}
                      stroke="var(--color-pumice)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      pointerEvents="none"
                      markerEnd={
                        pendingConnection.edgeKind === "arrow"
                          ? "url(#sketch-arrowhead)"
                          : undefined
                      }
                    />
                  );
                })()
              : null}
          </svg>

          {doc.nodes.map((node) => (
            <div
              key={node.id}
              onContextMenu={(event) =>
                openContextMenu(event, { type: "node", id: node.id })
              }
              className="absolute bg-[var(--color-obsidian)]"
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
            >
              <div
                className={cn(
                  "pointer-events-none relative h-full w-full border border-[var(--color-glacier)]",
                  node.shape === "bubble" ? "rounded-[9999px]" : "rounded-[4px]"
                )}
              />

              <div
                className={cn(
                  "absolute overflow-hidden",
                  node.shape === "bubble" ? "rounded-[9999px]" : "rounded-[4px]"
                )}
                style={{
                  inset: SKETCH_PERIMETER_DRAG_SIZE,
                }}
              >
                <textarea
                  value={node.text}
                  onChange={(event) =>
                    handleNodeTextChange(node.id, event.target.value)
                  }
                  placeholder="Type…"
                  className="h-full w-full resize-none overflow-hidden bg-transparent text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
                />
              </div>

              {(["top", "right", "bottom", "left"] as const).map((position) => (
                <PerimeterDragStrip
                  key={position}
                  position={position}
                  onPointerDown={(event) =>
                    handlePerimeterDragStart(event, node)
                  }
                />
              ))}

              <button
                type="button"
                data-resize-handle
                onPointerDown={(event) => handleResizeStart(event, node)}
                aria-label="Resize shape"
                className="absolute bottom-0 right-0 z-30 h-3 w-3 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border border-[var(--color-glacier)] bg-[var(--color-obsidian)]"
              />

              {showAnchors
                ? SKETCH_ANCHORS.map((anchor) => {
                    const point = getAnchorPoint(node, anchor);
                    return (
                      <button
                        key={anchor}
                        type="button"
                        aria-label={`Connect ${anchor}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() =>
                          handleAnchorClick(
                            node,
                            anchor,
                            pendingConnection?.edgeKind ??
                              connectMode ??
                              "line"
                          )
                        }
                        className={cn(
                          "absolute z-30 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-glacier)] bg-[var(--color-obsidian)] transition-transform duration-150 hover:scale-125",
                          pendingConnection?.fromNodeId === node.id &&
                            pendingConnection.fromAnchor === anchor &&
                            "scale-125 bg-[var(--color-ash)]"
                        )}
                        style={{ left: point.x - node.x, top: point.y - node.y }}
                      />
                    );
                  })
                : null}
            </div>
          ))}
        </div>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[120px] rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleCopyTarget}
            className="flex w-full px-3 py-2 text-left text-[13px] tracking-[-0.01em] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDeleteTarget}
            className="flex w-full px-3 py-2 text-left text-[13px] tracking-[-0.01em] text-[var(--color-ember)] transition-colors duration-200 hover:bg-[var(--color-ash)]"
          >
            Delete
          </button>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleZoom(SKETCH_DEFAULTS.zoomStep)}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] text-[var(--color-steam)] transition-colors duration-200 hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-SKETCH_DEFAULTS.zoomStep)}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] text-[var(--color-steam)] transition-colors duration-200 hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
        >
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setPanMode((current) => !current)}
          aria-label="Pan canvas"
          aria-pressed={panMode || panShortcutHeld}
          className={cn(
            "flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium tracking-[-0.01em] transition-[border-color,background-color,color] duration-200",
            panMode || panShortcutHeld
              ? "border-[var(--color-border-active)] bg-[var(--color-ash)] text-[var(--color-glacier)]"
              : "border-[var(--color-border-subtle)] text-[var(--color-steam)] hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
          )}
        >
          <span className="font-mono text-[11px] text-[var(--color-pumice)]">
            option + z
          </span>
          <Move size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
