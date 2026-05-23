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
  createSketchEdge,
  createSketchNode,
  getAnchorPoint,
  parseSketch,
  serializeSketch,
  SKETCH_ANCHORS,
  SKETCH_DEFAULTS,
  type SketchAnchor,
  type SketchDocument,
  type SketchEdgeKind,
  type SketchNode,
  type SketchTool,
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

function toolButtonClass(active: boolean) {
  return cn(
    "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium tracking-[-0.01em] transition-[border-color,background-color,color] duration-200",
    active
      ? "border-[var(--color-border-active)] bg-[var(--color-ash)] text-[var(--color-glacier)]"
      : "border-[var(--color-border-subtle)] text-[var(--color-steam)] hover:border-[var(--color-border-active)] hover:text-[var(--color-bone)]"
  );
}

export function SketchEditor({ content, onChange }: SketchEditorProps) {
  const [doc, setDoc] = useState<SketchDocument>(() => parseSketch(content));
  const [activeTool, setActiveTool] = useState<SketchTool>("box");
  const [panMode, setPanMode] = useState(false);
  const [panShortcutHeld, setPanShortcutHeld] = useState(false);
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragState, setDragState] = useState<DragState | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(content);

  const isPanning = panMode || panShortcutHeld;
  const showAnchors =
    activeTool === "line" ||
    activeTool === "arrow" ||
    pendingConnection !== null;

  useEffect(() => {
    if (content === lastSaved.current) return;
    const next = parseSketch(content);
    setDoc(next);
    lastSaved.current = content;
  }, [content]);

  useEffect(() => {
    if (!dragState) return;

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [dragState]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey && event.key.toLowerCase() === "z") {
        setPanShortcutHeld(true);
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
  }, []);

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

  const updateDoc = useCallback(
    (updater: (current: SketchDocument) => SketchDocument) => {
      setDoc((current) => {
        const next = updater(current);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  function handleZoom(delta: number) {
    updateDoc((current) => ({
      ...current,
      viewport: {
        ...current.viewport,
        zoom: clampZoom(current.viewport.zoom + delta),
      },
    }));
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        kind: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: doc.viewport.x,
        originY: doc.viewport.y,
      });
      return;
    }

    if (activeTool === "box" || activeTool === "bubble") {
      const world = clientToWorld(
        event.clientX,
        event.clientY,
        rect,
        doc.viewport
      );
      const node = createSketchNode(activeTool, world.x, world.y);
      updateDoc((current) => ({
        ...current,
        nodes: [...current.nodes, node],
      }));
    }
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const world = clientToWorld(
      event.clientX,
      event.clientY,
      rect,
      doc.viewport
    );
    setCursorWorld(world);

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

  function handleNodeDragStart(
    event: React.PointerEvent<HTMLDivElement>,
    node: SketchNode
  ) {
    if (isPanning || activeTool === "line" || activeTool === "arrow") return;
    if ((event.target as HTMLElement).closest("[data-resize-handle]")) return;
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;

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
      return;
    }

    const edge = createSketchEdge(
      pendingConnection.edgeKind,
      pendingConnection.fromNodeId,
      pendingConnection.fromAnchor,
      node.id,
      anchor
    );

    updateDoc((current) => ({
      ...current,
      edges: [...current.edges, edge],
    }));
    setPendingConnection(null);
  }

  function handleNodeTextChange(nodeId: string, text: string) {
    updateDoc((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, text } : node
      ),
    }));
  }

  const nodeMap = new Map(doc.nodes.map((node) => [node.id, node]));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)]">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTool("box");
            setPendingConnection(null);
          }}
          className={toolButtonClass(activeTool === "box")}
          aria-label="Add text box"
          aria-pressed={activeTool === "box"}
        >
          <Square size={14} strokeWidth={1.5} />
          Txt box
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTool("bubble");
            setPendingConnection(null);
          }}
          className={toolButtonClass(activeTool === "bubble")}
          aria-label="Add text bubble"
          aria-pressed={activeTool === "bubble"}
        >
          <Circle size={14} strokeWidth={1.5} />
          Txt bubble
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTool("line");
            setPendingConnection(null);
          }}
          className={toolButtonClass(activeTool === "line")}
          aria-label="Draw line"
          aria-pressed={activeTool === "line"}
        >
          <Minus size={14} strokeWidth={1.5} />
          Line
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTool("arrow");
            setPendingConnection(null);
          }}
          className={toolButtonClass(activeTool === "arrow")}
          aria-label="Draw arrow"
          aria-pressed={activeTool === "arrow"}
        >
          <ArrowRight size={14} strokeWidth={1.5} />
          Arrow
        </button>
      </div>

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
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
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
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--color-glacier)"
                  strokeWidth={1.5}
                  markerEnd={
                    edge.kind === "arrow" ? "url(#sketch-arrowhead)" : undefined
                  }
                />
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
              onPointerDown={(event) => handleNodeDragStart(event, node)}
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
                  "relative flex h-full w-full flex-col overflow-hidden border border-[var(--color-glacier)]",
                  node.shape === "bubble" ? "rounded-[9999px]" : "rounded-[4px]"
                )}
              >
                <textarea
                  value={node.text}
                  onChange={(event) =>
                    handleNodeTextChange(node.id, event.target.value)
                  }
                  placeholder="Type…"
                  className="h-full w-full resize-none overflow-hidden bg-transparent p-3 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
                />
                <button
                  type="button"
                  data-resize-handle
                  onPointerDown={(event) => handleResizeStart(event, node)}
                  aria-label="Resize shape"
                  className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border border-[var(--color-glacier)] bg-[var(--color-obsidian)]"
                />
              </div>

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
                              (activeTool === "arrow" ? "arrow" : "line")
                          )
                        }
                        className={cn(
                          "absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-glacier)] bg-[var(--color-obsidian)] transition-transform duration-150 hover:scale-125",
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
