"use client";

import { useEffect } from "react";
import { useUpdaterStore } from "@/stores/updater";

export default function UpdaterRunner() {
  const { checkForUpdates, status } = useUpdaterStore();

  useEffect(() => {
    if (status === "idle") {
      checkForUpdates();
    }
  }, [checkForUpdates, status]);

  return null;
}
