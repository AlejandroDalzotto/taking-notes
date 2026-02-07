import { useEffect } from "react";
import { useCheckMigration } from "@/stores/migration";
import { useUpdaterStatus } from "@/stores/updater";

export default function MigrationRunner() {
  const check = useCheckMigration();
  const updateStatus = useUpdaterStatus();

  // Run migration check once on component mount when the update status is "no-update".
  // We intentionally omit `check` from the dependency array to avoid re-running
  // the effect when the migration status updates (which could cause a loop).
  useEffect(() => {
    console.log("updater status", updateStatus);
    const execute = async () => {
      if (updateStatus === "no-update") {
        await check();
      }
    };

    execute();
  }, [updateStatus]);

  return null;
}
