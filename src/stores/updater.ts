import { create } from "zustand";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

type UpdaterStatus = "idle" | "checking" | "downloading" | "complete" | "no-update" | "error";

interface UpdaterStore {
  status: UpdaterStatus;
  error: string | null;
  actions: {
    checkForUpdates: () => Promise<void>;
  };
}

const useUpdaterStore = create<UpdaterStore>((set) => ({
  status: "idle",
  error: null,
  updateInfo: null,

  actions: {
    checkForUpdates: async () => {
      set({ status: "checking" });

      try {
        // check if the application is running in dev mode before checking for updates
        const isDev = process.env.NODE_ENV === "development";

        if (isDev) {
          // we do not check for updates in development mode
          // yet we let the app to perform migration checks if needed by setting status to "no-update".
          set({ status: "no-update" });
          return;
        }

        // check for updates
        const update = await check();
        if (!update) {
          set({ status: "no-update" });
          return;
        }

        if (update.version != update.currentVersion) {
          set({ status: "downloading" });

          // alternatively we could also call update.download() and update.install() separately
          await update.downloadAndInstall();

          set({ status: "complete" });
          await relaunch();
        } else {
          set({ status: "no-update" });
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        set({ status: "error", error: errorMessage });
      }
    },
  },
}));

export const useCheckForUpdates = () => useUpdaterStore((state) => state.actions.checkForUpdates);

export const useUpdaterStatus = () => useUpdaterStore((state) => state.status);
