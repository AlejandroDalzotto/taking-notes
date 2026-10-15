import { useEffect } from "react";
import { useCheckMigration } from "@/stores/migration";

export default function MigrationRunner() {
  const check = useCheckMigration();
  useEffect(() => { void check(); }, [check]);
  return null;
}
