"use client";

import { listen } from "@tauri-apps/api/event";
import { createContext, useEffect } from "react";
import { toast } from "sonner";

const MigrationContext = createContext({})

export default function MigrationProvider({
  children
}: {
  children: React.ReactNode
}) {

  useEffect(() => {
    const unlistenStart = listen<string>('migration-started', (e) => {
      toast.loading(e.payload)
    })
    const unlistenFinish = listen<string>('migration-finished', (e) => {
      toast.success(e.payload)
    })

    return () => {
      unlistenStart.then(f => f());
      unlistenFinish.then(f => f());
    }
  }, []);


  return <MigrationContext.Provider value={{}}>{children}</MigrationContext.Provider>
}
