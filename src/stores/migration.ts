import { create } from "zustand";
import { checkForMigrationToV2, migrateV1ToV2 } from "@/lib/commands";

type MigrationStatus = "idle" | "checking" | "complete" | "error";

interface MigrationStore {
  status: MigrationStatus;
  error: string | null;
  actions: {
    runMigrations: () => Promise<void>;
    check: () => Promise<void>;
  };
}

const useMigrationStore = create<MigrationStore>((set, get) => ({
  status: "idle",
  error: null,

  actions: {
    runMigrations: async () => {
      try {
        console.log("migration needed, performing migration");
        await migrateV1ToV2();

        set({ status: "complete" });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        set({ status: "error", error: errorMessage });
      }
    },
    check: async () => {
      console.log("Checking migrations...");
      set({ status: "checking" });

      // V1 -> V2 migration
      const needsMigration = await checkForMigrationToV2();
      console.log({ needsMigration });
      if (needsMigration) {
        await get().actions.runMigrations();
      } else {
        set({ status: "complete" });
      }
    },
  },
}));

export const useCheckMigration = () => useMigrationStore((state) => state.actions.check);

export const useMigrationStatus = () => useMigrationStore((state) => state.status);
