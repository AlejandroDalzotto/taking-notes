"use client";

import { useEffect } from "react";
import { useCheckMigration } from "@/stores/migration";

export default function MigrationRunner() {
  const check = useCheckMigration();

  // Run migration check once on component mount.
  // We intentionally omit `check` from the dependency array to avoid re-running
  // the effect when the migration status updates (which could cause a loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const execute = async () => {
      await check();
    };

    execute();
  }, []);

  return null;
}
