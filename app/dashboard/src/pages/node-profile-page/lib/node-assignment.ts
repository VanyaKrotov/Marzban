export type NodeAssignedConfig = {
  readonly: boolean;
  enabled: boolean;
  node_ids: number[];
};

export function isVisibleOnNode(config: NodeAssignedConfig, nodeId: number) {
  return config.readonly || config.node_ids.includes(nodeId);
}

export function isEnabledOnNode(config: NodeAssignedConfig, nodeId: number) {
  return config.readonly ? config.node_ids.includes(nodeId) : config.enabled;
}

export function updateNodeAssignment(
  nodeIds: number[],
  nodeId: number,
  assigned: boolean,
) {
  const next = new Set(nodeIds);
  if (assigned) {
    next.add(nodeId);
  } else {
    next.delete(nodeId);
  }
  return Array.from(next);
}

export function readonlyFirst<T extends { readonly: boolean }>(items: T[]) {
  return [...items].sort((a, b) => Number(b.readonly) - Number(a.readonly));
}
