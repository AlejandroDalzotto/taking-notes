import { create } from "zustand";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "@/stores/editor";

type UpdaterStatus = "idle" | "checking" | "downloading" | "complete" | "no-update" | "error";
interface UpdaterStore {
  status: UpdaterStatus;
  error: string | null;
  actions: { checkForUpdates: () => Promise<void> };
}

const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  status: "idle",
  error: null,
  actions: {
    checkForUpdates: async () => {
      if (["checking", "downloading"].includes(get().status)) return;
      set({ status: "checking", error: null });
      let update: Awaited<ReturnType<typeof check>> = null;
      try {
        // This action is invoked only from Help, never during app initialization.
        update = await check({ timeout: 15000 });
        if (!update) {
          set({ status: "no-update" });
          await message("You're using the latest version of Taking Notes.", { title: "No updates available", kind: "info" });
          return;
        }
        const install = await ask(`Version ${update.version} is available. Download and restart now? Your local session will be saved first.`, {
          title: "Update Taking Notes", kind: "info", okLabel: "Update & restart", cancelLabel: "Not now",
        });
        if (!install) { set({ status: "idle" }); return; }
        // Freeze editing before taking the final snapshot: the Windows installer
        // may exit the process before downloadAndInstall resolves.
        set({ status: "downloading" });
        await useEditorStore.getState().actions.persistSession();
        await update.downloadAndInstall();
        set({ status: "complete" });
        await relaunch();
      } catch (cause) {
        const error = cause instanceof Error ? cause.message : String(cause);
        set({ status: "error", error });
        useEditorStore.setState({ editorError: `Unable to update. Your notes are still available offline. ${error}` });
      } finally {
        await update?.close().catch(console.error);
      }
    },
  },
}));

export const useCheckForUpdates = () => useUpdaterStore((state) => state.actions.checkForUpdates);
export const useUpdaterStatus = () => useUpdaterStore((state) => state.status);
