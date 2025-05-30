"use client";

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

        // console.log("update:: ", update);
        // toast.loading(<div className="flex flex-col w-fit">
        //   {update && (<h1 className="text-lg font-geist-mono">{update.body ?? "New version available"}</h1>)}
        //   <p className="whitespace-nowrap">The application will automatically restart to complete the update.</p>
        // </div>);
        if (isDev) {
          console.info("Running in development mode, skipping update check.");
          toast.error("Updates are not available in development mode. Please build the application to check for updates.");
          return;
        }

        // check for updates
        const update = await check();
        if (update && update.version != update.currentVersion) {
          let downloaded = 0;
          let contentLength = 0;
          // alternatively we could also call update.download() and update.install() separately
          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength ?? 0;
                console.log(`started downloading ${event.data.contentLength} bytes`);
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                console.log(`downloaded ${downloaded} from ${contentLength}`);
                break;
              case 'Finished':
                console.log('download finished');
                break;
            }
          });
          await relaunch();
        }
      } catch (error) {
        console.log({ error })
      }
    })();
  }, []);


  return <UpdateContext.Provider value={{}}>{children}</UpdateContext.Provider>
}
