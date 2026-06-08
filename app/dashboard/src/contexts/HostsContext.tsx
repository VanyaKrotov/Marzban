import { fetch } from "service/http";
import { create } from "zustand";

export type HostsSchema = Record<
  string,
  {
    remark: string;
    address: string;
    port: number | null;
    path: string | null;
    sni: string | null;
    host: string | null;
  }[]
>;

export type InboundNodesSchema = Record<string, number[]>;

type HostsStore = {
  isLoading: boolean;
  isPostLoading: boolean;
  hosts: HostsSchema;
  inboundNodes: InboundNodesSchema;
  fetchHosts: () => void;
  setHosts: (
    hosts: HostsSchema,
    inboundNodes: InboundNodesSchema
  ) => Promise<void>;
  toggleInboundNode: (inboundTag: string, nodeId: number) => void;
};
export const useHosts = create<HostsStore>((set) => ({
  isLoading: false,
  isPostLoading: false,
  hosts: {},
  inboundNodes: {},
  fetchHosts: () => {
    set({ isLoading: true });
    fetch<HostsSchema>("/hosts")
      .then((hosts) => {
        set({ hosts });
        return fetch<InboundNodesSchema>("/inbounds/nodes")
          .then((inboundNodes) => set({ inboundNodes }))
          .catch(() => set({ inboundNodes: {} }));
      })
      .finally(() => set({ isLoading: false }));
  },
  setHosts: (hosts, inboundNodes) => {
    set({ isPostLoading: true });
    return fetch<HostsSchema>("/hosts", { method: "PUT", body: hosts })
      .then((hosts) =>
        fetch<InboundNodesSchema>("/inbounds/nodes", {
          method: "PUT",
          body: inboundNodes,
        }).then((inboundNodes) => ({ hosts, inboundNodes }))
      )
      .then(({ hosts, inboundNodes }) => {
        set({ hosts, inboundNodes });
      })
      .finally(() => {
        set({ isPostLoading: false });
      });
  },
  toggleInboundNode: (inboundTag, nodeId) => {
    set((state) => {
      const assignedNodes = state.inboundNodes[inboundTag] || [];
      const nextAssignedNodes = assignedNodes.includes(nodeId)
        ? assignedNodes.filter((id) => id !== nodeId)
        : [...assignedNodes, nodeId];

      return {
        inboundNodes: {
          ...state.inboundNodes,
          [inboundTag]: nextAssignedNodes,
        },
      };
    });
  },
}));
