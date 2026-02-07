import { useEffect } from "react";
import { useCheckForUpdates } from "@/stores/updater";

export default function UpdaterRunner() {
  const checkForUpdates = useCheckForUpdates();

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return null;
}
