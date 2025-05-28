"use client";

import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { createContext, useEffect } from "react";

export const UpdateContext = createContext({})

export default function UpdaterProvider({
  children
}: {
  children: React.ReactNode
}) {

  useEffect(() => {
    (async () => {
      try {
        const update = await check();
        console.log("update:: ", update);
        if (update && update?.version != update?.currentVersion) {
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
