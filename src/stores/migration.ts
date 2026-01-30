import { create } from "zustand";
import { checkForMigrationToV2, getSchemaVersion, migrateV1ToV2 } from "@/lib/commands";
import { toast } from "sonner";
import { SchemaVersion } from "@/lib/types";

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
        toast.info("Checking files integrity, please do not close the app.");

        // V1 -> V2 migration
        const needsMigration = await checkForMigrationToV2();
        if (needsMigration) {
          await migrateV1ToV2();
          toast.success("Notes checked successfully! Migration performed from V1 to V2.");
        }

        set({ status: "complete" });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        set({ status: "error", error: errorMessage });
        toast.error("Something went wrong, please restart the app or ask for help.");
      }
    },
    check: async () => {
      console.log("Checking migrations...");
      set({ status: "checking" });

      const version = await getSchemaVersion();
      if (version === SchemaVersion.V2) {
        set({ status: "complete" });
        return;
      }

      await get().actions.runMigrations();
    },
  },
}));

export const useCheckMigration = () => useMigrationStore((state) => state.actions.check);

export const useMigrationStatus = () => useMigrationStore((state) => state.status);
