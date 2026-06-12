import { StatisticsQueryKey } from "components/Statistics";
import { api } from "service/http";
import { User, UserCreate } from "types/User";
import { queryClient } from "utils/react-query";
import { getUsersPerPageLimitSize } from "utils/userPreferenceStorage";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type FilterType = {
  search?: string;
  limit?: number;
  offset?: number;
  sort: string;
  status?: "active" | "disabled" | "limited" | "expired" | "on_hold";
};
export type ProtocolType = "vmess" | "vless" | "trojan" | "shadowsocks";

export type FilterUsageType = {
  start?: string;
  end?: string;
};

export type InboundType = {
  tag: string;
  protocol: ProtocolType;
  network: string;
  tls: string;
  port?: number;
};
export type Inbounds = Map<ProtocolType, InboundType[]>;
type UsersResponse = DashboardStateType["users"];

type DashboardStateType = {
  isCreatingNewUser: boolean;
  editingUser: User | null | undefined;
  deletingUser: User | null;
  version: string | null;
  users: {
    users: User[];
    total: number;
  };
  inbounds: Inbounds;
  loading: boolean;
  filters: FilterType;
  subscribeUrl: string | null;
  QRcodeLinks: string[] | null;
  isEditingHosts: boolean;
  isEditingNodes: boolean;
  isShowingNodesUsage: boolean;
  isResetingAllUsage: boolean;
  resetUsageUser: User | null;
  revokeSubscriptionUser: User | null;
  isEditingCore: boolean;
  onCreateUser: (isOpen: boolean) => void;
  onEditingUser: (user: User | null) => void;
  onDeletingUser: (user: User | null) => void;
  onResetAllUsage: (isResetingAllUsage: boolean) => void;
  refetchUsers: () => void;
  resetAllUsage: () => Promise<void>;
  onFilterChange: (filters: Partial<FilterType>) => void;
  deleteUser: (user: User) => Promise<void>;
  createUser: (user: UserCreate) => Promise<void>;
  editUser: (user: UserCreate) => Promise<void>;
  fetchUserUsage: (user: User, query: FilterUsageType) => Promise<void>;
  setQRCode: (links: string[] | null) => void;
  setSubLink: (subscribeURL: string | null) => void;
  onEditingHosts: (isEditingHosts: boolean) => void;
  onEditingNodes: (isEditingHosts: boolean) => void;
  onShowingNodesUsage: (isShowingNodesUsage: boolean) => void;
  resetDataUsage: (user: User) => Promise<void>;
  revokeSubscription: (user: User) => Promise<void>;
};

const fetchUsers = (query: FilterType): Promise<UsersResponse> => {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value)
  );
  useDashboard.setState({ loading: true });
  return api.get<UsersResponse>("/users", { params })
    .then((users) => {
      useDashboard.setState({ users });
      return users;
    })
    .finally(() => {
      useDashboard.setState({ loading: false });
    });
};

export const fetchInbounds = () => {
  return api.get<Record<ProtocolType, InboundType[]>>("/inbounds")
    .then((inbounds) => {
      useDashboard.setState({
        inbounds: new Map(Object.entries(inbounds)) as Inbounds,
      });
    })
    .finally(() => {
      useDashboard.setState({ loading: false });
    });
};

export const useDashboard = create(
  subscribeWithSelector<DashboardStateType>((set, get) => ({
    version: null,
    editingUser: null,
    deletingUser: null,
    isCreatingNewUser: false,
    QRcodeLinks: null,
    subscribeUrl: null,
    users: {
      users: [],
      total: 0,
    },
    loading: true,
    isResetingAllUsage: false,
    isEditingHosts: false,
    isEditingNodes: false,
    isShowingNodesUsage: false,
    resetUsageUser: null,
    revokeSubscriptionUser: null,
    filters: {
      username: "",
      limit: getUsersPerPageLimitSize(),
      sort: "-created_at",
    },
    inbounds: new Map(),
    isEditingCore: false,
    refetchUsers: () => {
      fetchUsers(get().filters);
    },
    resetAllUsage: () => {
      return api.post<void>(`/users/reset`).then(() => {
        get().onResetAllUsage(false);
        get().refetchUsers();
      });
    },
    onResetAllUsage: (isResetingAllUsage) => set({ isResetingAllUsage }),
    onCreateUser: (isCreatingNewUser) => set({ isCreatingNewUser }),
    onEditingUser: (editingUser) => {
      set({ editingUser });
    },
    onDeletingUser: (deletingUser) => {
      set({ deletingUser });
    },
    onFilterChange: (filters) => {
      set({
        filters: {
          ...get().filters,
          ...filters,
        },
      });
      get().refetchUsers();
    },
    setQRCode: (QRcodeLinks) => {
      set({ QRcodeLinks });
    },
    deleteUser: (user: User) => {
      set({ editingUser: null });
      return api.delete<void>(`/user/${user.username}`).then(() => {
        set({ deletingUser: null });
        get().refetchUsers();
        queryClient.invalidateQueries(StatisticsQueryKey);
      });
    },
    createUser: (body: UserCreate) => {
      return api.post<void>(`/user`, body).then(() => {
        set({ editingUser: null });
        get().refetchUsers();
        queryClient.invalidateQueries(StatisticsQueryKey);
      });
    },
    editUser: (body: UserCreate) => {
      return api.put<void>(`/user/${body.username}`, body).then(
        () => {
          get().onEditingUser(null);
          get().refetchUsers();
        }
      );
    },
    fetchUserUsage: (body: User, query: FilterUsageType) => {
      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value)
      );
      return api.get(`/user/${body.username}/usage`, { params });
    },
    onEditingHosts: (isEditingHosts: boolean) => {
      set({ isEditingHosts });
    },
    onEditingNodes: (isEditingNodes: boolean) => {
      set({ isEditingNodes });
    },
    onShowingNodesUsage: (isShowingNodesUsage: boolean) => {
      set({ isShowingNodesUsage });
    },
    setSubLink: (subscribeUrl) => {
      set({ subscribeUrl });
    },
    resetDataUsage: (user) => {
      return api.post<void>(`/user/${user.username}/reset`).then(
        () => {
          set({ resetUsageUser: null });
          get().refetchUsers();
        }
      );
    },
    revokeSubscription: (user) => {
      return api.post<User>(`/user/${user.username}/revoke_sub`).then((user) => {
        set({ revokeSubscriptionUser: null, editingUser: user });
        get().refetchUsers();
      });
    },
  }))
);
