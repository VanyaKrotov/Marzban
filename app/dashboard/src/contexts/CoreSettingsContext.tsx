import { api } from "service/http";
import { create } from "zustand";

type CoreSettingsStore = {
  isLoading: boolean;
  isPostLoading: boolean;
  fetchCoreSettings: () => void;
  updateConfig: (json: string) => Promise<void>;
  restartCore: () => Promise<void>;
  version: string | null;
  started: boolean | null;
  logs_websocket: string | null;
  config: string;
};

type CoreStatus = {
  version: string;
  started: boolean;
  logs_websocket: string | null;
};

export const useCoreSettings = create<CoreSettingsStore>((set) => ({
  isLoading: true,
  isPostLoading: false,
  version: null,
  started: false,
  logs_websocket: null,
  config: "",
  fetchCoreSettings: () => {
    set({ isLoading: true });
    Promise.all([
      api.get<CoreStatus>("/core").then(({ version, started, logs_websocket }) =>
        set({ version, started, logs_websocket })
      ),
      api.get<string>("/core/config").then((config) => set({ config })),
    ]).finally(() => set({ isLoading: false }));
  },
  updateConfig: (body) => {
    set({ isPostLoading: true });
    return api.put<void>("/core/config", body).finally(() => {
      set({ isPostLoading: false });
    });
  },
  restartCore: () => {
    return api.post<void>("/core/restart");
  },
}));
