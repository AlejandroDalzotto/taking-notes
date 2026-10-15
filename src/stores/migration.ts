import { create } from "zustand";
import { checkForMigrationToV2, migrateV1ToV2 } from "@/lib/commands";

type MigrationStatus = "idle" | "checking" | "complete" | "error";
interface MigrationStore {
  status: MigrationStatus;
  error: string | null;
  actions: { check: () => Promise<void> };
}

const useMigrationStore = create<MigrationStore>((set, get) => ({
  status: "idle",
  error: null,
  actions: {
    check: async () => {
      if (get().status === "checking" || get().status === "complete") return;
      set({ status: "checking", error: null });
      try {
        if (await checkForMigrationToV2()) await migrateV1ToV2();
        set({ status: "complete" });
      } catch (cause) {
        set({ status: "error", error: cause instanceof Error ? cause.message : String(cause) });
      }
    },
  },
}));

export const useCheckMigration = () => useMigrationStore((state) => state.actions.check);
export const useMigrationStatus = () => useMigrationStore((state) => state.status);
export const useMigrationError = () => useMigrationStore((state) => state.error);
