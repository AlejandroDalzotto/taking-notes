import { create } from "zustand";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

type UpdaterStatus = "idle" | "checking" | "downloading" | "complete" | "no-update" | "error";

interface UpdaterStore {
  status: UpdaterStatus;
  error: string | null;
  checkForUpdates: () => Promise<void>;
}

export const useUpdaterStore = create<UpdaterStore>((set) => ({
  status: "idle",
  error: null,
  updateInfo: null,

  checkForUpdates: async () => {
    set({ status: "checking", error: null });

    try {
      // check if the application is running in dev mode before checking for updates
      const isDev = process.env.NODE_ENV === "development";

      if (isDev) {
        set({ status: "error", error: "Development mode" });
        toast.error("Updates are not available in development mode. Please build the application to check for updates.");
        return;
      }

      // check for updates
      const update = await check();
      if (!update) {
        set({ status: "no-update" });
        toast.success("No updates available.");
        return;
      }

      if (update.version != update.currentVersion) {
        set({ status: "downloading" });

        toast.loading(update.body ?? `New version ${update.version} available`);

        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall();

        set({ status: "complete" });
        await relaunch();
      } else {
        set({ status: "no-update" });
        toast.success("No updates available.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      set({ status: "error", error: errorMessage });
      toast.error("Failed to check for updates. Please try again later.");
    }
  },
}));
