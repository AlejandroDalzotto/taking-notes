"use client";

import { Log } from "@/lib/services/log";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { createContext, useEffect } from "react";
import { toast } from "sonner";

export const UpdateContext = createContext({})

export default function UpdaterProvider({
  children
}: {
  children: React.ReactNode
}) {

  useEffect(() => {
    (async () => {
      try {
        // check if the application is running in dev mode before checking for updates
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
          toast.error("Updates are not available in development mode. Please build the application to check for updates.");
          return;
        }


        // check for updates
        const update = await check();
        if (!update) {
          toast.success("No updates available.");
          return;
        }

        if (update.version != update.currentVersion) {
          toast.loading(
            <div className="flex flex-col w-fit">
              {update && (<h1 className="text-lg font-geist-mono">{update.body ?? `New version ${update.version} available`}</h1>)}
              <p className="whitespace-nowrap">The application will automatically restart to complete the update.</p>
            </div>
          );
          // alternatively we could also call update.download() and update.install() separately
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (e) {
        Log.error("Error checking for updates", (e as Error).message)
        toast.error("Failed to check for updates. Please try again later.");
      }
    })();
  }, []);


  return <UpdateContext.Provider value={{}}>{children}</UpdateContext.Provider>
}
