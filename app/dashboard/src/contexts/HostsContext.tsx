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

export type NodeCertificateSchema = {
  id: number;
  node_id: number;
  domain: string;
  certificate: string;
  expires_at?: string | null;
  active: boolean;
  inbound_tags: string[];
  created_at: string;
  updated_at: string;
};

export type InboundCertificatesSchema = Record<string, number[]>;

type HostsStore = {
  isLoading: boolean;
  isPostLoading: boolean;
  hosts: HostsSchema;
  inboundNodes: InboundNodesSchema;
  nodeCertificates: NodeCertificateSchema[];
  inboundCertificates: InboundCertificatesSchema;
  fetchHosts: () => void;
  setHosts: (
    hosts: HostsSchema,
    inboundNodes: InboundNodesSchema,
    inboundCertificates: InboundCertificatesSchema
  ) => Promise<void>;
  setInboundNodes: (inboundTag: string, nodeIds: number[]) => void;
  setInboundCertificates: (inboundTag: string, certificateIds: number[]) => void;
};
export const useHosts = create<HostsStore>((set) => ({
  isLoading: false,
  isPostLoading: false,
  hosts: {},
  inboundNodes: {},
  nodeCertificates: [],
  inboundCertificates: {},
  fetchHosts: () => {
    set({ isLoading: true });
    fetch<HostsSchema>("/hosts")
      .then((hosts) => {
        set({ hosts });
        return Promise.all([
          fetch<InboundNodesSchema>("/inbounds/nodes").catch(() => ({})),
          fetch<NodeCertificateSchema[]>("/node-certificates").catch(() => []),
          fetch<InboundCertificatesSchema>("/inbounds/certificates").catch(
            () => ({})
          ),
        ]).then(([inboundNodes, nodeCertificates, inboundCertificates]) =>
          set({ inboundNodes, nodeCertificates, inboundCertificates })
        );
      })
      .finally(() => set({ isLoading: false }));
  },
  setHosts: (hosts, inboundNodes, inboundCertificates) => {
    set({ isPostLoading: true });
    return fetch<HostsSchema>("/hosts", { method: "PUT", body: hosts })
      .then((hosts) =>
        fetch<InboundNodesSchema>("/inbounds/nodes", {
          method: "PUT",
          body: inboundNodes,
        }).then((inboundNodes) => ({ hosts, inboundNodes }))
      )
      .then(({ hosts, inboundNodes }) =>
        fetch<InboundCertificatesSchema>("/inbounds/certificates", {
          method: "PUT",
          body: inboundCertificates,
        }).then((inboundCertificates) => ({
          hosts,
          inboundNodes,
          inboundCertificates,
        }))
      )
      .then(({ hosts, inboundNodes, inboundCertificates }) =>
        set({ hosts, inboundNodes, inboundCertificates })
      )
      .finally(() => {
        set({ isPostLoading: false });
      });
  },
  setInboundNodes: (inboundTag, nodeIds) => {
    set((state) => {
      const allowedCertificateIds = new Set(
        state.nodeCertificates
          .filter((certificate) => nodeIds.includes(certificate.node_id))
          .map((certificate) => certificate.id)
      );
      return {
        inboundNodes: {
          ...state.inboundNodes,
          [inboundTag]: nodeIds,
        },
        inboundCertificates: {
          ...state.inboundCertificates,
          [inboundTag]: (state.inboundCertificates[inboundTag] || []).filter(
            (certificateId) => allowedCertificateIds.has(certificateId)
          ),
        },
      };
    });
  },
  setInboundCertificates: (inboundTag, certificateIds) => {
    set((state) => ({
      inboundCertificates: {
        ...state.inboundCertificates,
        [inboundTag]: certificateIds,
      },
    }));
  },
}));
