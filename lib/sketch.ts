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
  x: number,
  y: number
): SketchNode {
  const size = SKETCH_DEFAULTS[shape];
  return {
    id: crypto.randomUUID(),
    shape,
    x: x - size.width / 2,
    y: y - size.height / 2,
    width: size.width,
    height: size.height,
    text: "",
  };
}

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
