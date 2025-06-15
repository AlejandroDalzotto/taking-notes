"use client";

import { invoke } from "@tauri-apps/api/core";
import { createContext, useEffect } from "react";
import { toast } from "sonner";

const MigrationContext = createContext({})

export default function MigrationProvider({
  children
}: {
  children: React.ReactNode
}) {

  useEffect(() => {
    invoke<boolean>('check_for_migration').then(needsMigration => {
      toast.info('Checking files integrity, please do not close the app.', { duration: 1500 })

      if (needsMigration) {
        invoke('migrate_v1_to_v2')
          .then(() => {
            toast.success('Notes checked successfully! Migration performed from V1 to V2.')
          })
          .catch(() => {
            toast.error('Something went wrong, please restart the app or ask for help.')
          })
      }
    })

  }, []);


  return <MigrationContext.Provider value={{}}>{children}</MigrationContext.Provider>
}
