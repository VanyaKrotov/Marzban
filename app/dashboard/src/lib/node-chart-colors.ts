const NODE_CHART_COLOR_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#0f766e",
  "#be123c",
  "#7c3aed",
  "#ca8a04",
  "#0284c7",
  "#c2410c",
  "#4d7c0f",
  "#a21caf",
  "#0e7490",
  "#b91c1c",
] as const;

export const DEFAULT_NODE_CHART_COLOR = "#64748b";

const GOLDEN_ANGLE = 137.508;

export function createNodeChartColors(nodeIds: Iterable<number>) {
  const sortedNodeIds = [...new Set(nodeIds)].sort((first, second) => {
    return first - second;
  });

  return new Map(
    sortedNodeIds.map((nodeId, index) => [
      nodeId,
      getNodeChartColorByIndex(index),
    ]),
  );
}

export function getNodeChartColor(
  nodeId: number | null | undefined,
  colors: ReadonlyMap<number, string>,
) {
  return nodeId === null || nodeId === undefined
    ? DEFAULT_NODE_CHART_COLOR
    : (colors.get(nodeId) ?? DEFAULT_NODE_CHART_COLOR);
}

function getNodeChartColorByIndex(index: number) {
  const paletteColor = NODE_CHART_COLOR_PALETTE[index];
  if (paletteColor) return paletteColor;

  const overflowIndex = index - NODE_CHART_COLOR_PALETTE.length;
  const hue = (overflowIndex * GOLDEN_ANGLE) % 360;
  const saturation = 64 + (overflowIndex % 3) * 8;
  const lightness = 42 + (Math.floor(overflowIndex / 3) % 3) * 6;

  return `hsl(${hue.toFixed(3)}deg ${saturation}% ${lightness}%)`;
}
