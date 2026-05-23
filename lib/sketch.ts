export const SKETCH_ARTIFACT_KIND = "sketch";

export type SketchNodeShape = "box" | "bubble";
export type SketchEdgeKind = "line" | "arrow";
export type SketchAnchor = "top" | "right" | "bottom" | "left";
export type SketchTool = "box" | "bubble" | "line" | "arrow";

export interface SketchNode {
  id: string;
  shape: SketchNodeShape;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface SketchEdge {
  id: string;
  kind: SketchEdgeKind;
  fromNodeId: string;
  fromAnchor: SketchAnchor;
  toNodeId: string;
  toAnchor: SketchAnchor;
}

export interface SketchViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SketchDocument {
  nodes: SketchNode[];
  edges: SketchEdge[];
  viewport: SketchViewport;
}

export const SKETCH_DEFAULTS = {
  box: { width: 168, height: 96 },
  bubble: { width: 208, height: 104 },
  minWidth: 80,
  minHeight: 48,
  zoomMin: 0.25,
  zoomMax: 2,
  zoomStep: 0.1,
} as const;

export function createEmptySketchDocument(): SketchDocument {
  return {
    nodes: [],
    edges: [],
    viewport: { x: 48, y: 48, zoom: 1 },
  };
}

export function serializeSketch(document: SketchDocument): string {
  return JSON.stringify(document);
}

export function parseSketch(content: string | null | undefined): SketchDocument {
  if (!content?.trim()) {
    return createEmptySketchDocument();
  }

  try {
    const parsed = JSON.parse(content) as Partial<SketchDocument>;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      viewport: {
        x: parsed.viewport?.x ?? 48,
        y: parsed.viewport?.y ?? 48,
        zoom: clampZoom(parsed.viewport?.zoom ?? 1),
      },
    };
  } catch {
    return createEmptySketchDocument();
  }
}

export function clampZoom(value: number): number {
  return Math.min(
    SKETCH_DEFAULTS.zoomMax,
    Math.max(SKETCH_DEFAULTS.zoomMin, value)
  );
}

export function createSketchNode(
  shape: SketchNodeShape,
  centerX: number,
  centerY: number
): SketchNode {
  const size = SKETCH_DEFAULTS[shape];
  return {
    id: crypto.randomUUID(),
    shape,
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    width: size.width,
    height: size.height,
    text: "",
  };
}

export function nodesOverlap(
  left: Pick<SketchNode, "x" | "y" | "width" | "height">,
  right: Pick<SketchNode, "x" | "y" | "width" | "height">,
  gap = 12
): boolean {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

export function getCanvasCenterWorld(
  rect: DOMRect,
  viewport: SketchViewport
): { x: number; y: number } {
  return {
    x: (rect.width / 2 - viewport.x) / viewport.zoom,
    y: (rect.height / 2 - viewport.y) / viewport.zoom,
  };
}

export function placeSketchNode(
  shape: SketchNodeShape,
  preferredCenterX: number,
  preferredCenterY: number,
  existingNodes: SketchNode[]
): SketchNode {
  const step = 36;

  for (let ring = 0; ring < 16; ring += 1) {
    if (ring === 0) {
      const candidate = createSketchNode(
        shape,
        preferredCenterX,
        preferredCenterY
      );
      if (!existingNodes.some((node) => nodesOverlap(candidate, node))) {
        return candidate;
      }
      continue;
    }

    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

        const candidate = createSketchNode(
          shape,
          preferredCenterX + dx * step,
          preferredCenterY + dy * step
        );

        if (!existingNodes.some((node) => nodesOverlap(candidate, node))) {
          return candidate;
        }
      }
    }
  }

  return createSketchNode(
    shape,
    preferredCenterX + step * 2,
    preferredCenterY + step * 2
  );
}

export function duplicateSketchNode(
  source: SketchNode,
  centerX: number,
  centerY: number
): SketchNode {
  return {
    ...source,
    id: crypto.randomUUID(),
    x: centerX - source.width / 2,
    y: centerY - source.height / 2,
  };
}

export function duplicateSketchEdge(source: SketchEdge): SketchEdge {
  return {
    ...source,
    id: crypto.randomUUID(),
  };
}

export function placeDuplicateNode(
  source: SketchNode,
  preferredCenterX: number,
  preferredCenterY: number,
  existingNodes: SketchNode[]
): SketchNode {
  const initial = duplicateSketchNode(
    source,
    preferredCenterX,
    preferredCenterY
  );

  if (!existingNodes.some((node) => nodesOverlap(initial, node))) {
    return initial;
  }

  const step = 36;

  for (let ring = 1; ring < 16; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

        const candidate = duplicateSketchNode(
          source,
          preferredCenterX + dx * step,
          preferredCenterY + dy * step
        );

        if (!existingNodes.some((node) => nodesOverlap(candidate, node))) {
          return candidate;
        }
      }
    }
  }

  return duplicateSketchNode(
    source,
    preferredCenterX + step * 2,
    preferredCenterY + step * 2
  );
}

export type SketchClipboard =
  | { type: "node"; node: SketchNode }
  | { type: "edge"; edge: SketchEdge };

export function createSketchEdge(
  kind: SketchEdgeKind,
  fromNodeId: string,
  fromAnchor: SketchAnchor,
  toNodeId: string,
  toAnchor: SketchAnchor
): SketchEdge {
  return {
    id: crypto.randomUUID(),
    kind,
    fromNodeId,
    fromAnchor,
    toNodeId,
    toAnchor,
  };
}

export function getAnchorPoint(
  node: SketchNode,
  anchor: SketchAnchor
): { x: number; y: number } {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;

  switch (anchor) {
    case "top":
      return { x: centerX, y: node.y };
    case "right":
      return { x: node.x + node.width, y: centerY };
    case "bottom":
      return { x: centerX, y: node.y + node.height };
    case "left":
      return { x: node.x, y: centerY };
  }
}

export const SKETCH_ANCHORS: SketchAnchor[] = [
  "top",
  "right",
  "bottom",
  "left",
];

export function cloneSketchDocument(document: SketchDocument): SketchDocument {
  return structuredClone(document);
}

export function deleteSketchNode(
  document: SketchDocument,
  nodeId: string
): SketchDocument {
  return {
    ...document,
    nodes: document.nodes.filter((node) => node.id !== nodeId),
    edges: document.edges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
    ),
  };
}

export function deleteSketchEdge(
  document: SketchDocument,
  edgeId: string
): SketchDocument {
  return {
    ...document,
    edges: document.edges.filter((edge) => edge.id !== edgeId),
  };
}

export const SKETCH_PERIMETER_DRAG_SIZE = 10;
