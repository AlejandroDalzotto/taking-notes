import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router";
import { takeCliFilePaths } from "@/lib/commands";
import { useEditorActions, useEditorStore } from "@/stores/editor";
import { useMigrationStatus } from "@/stores/migration";

export default function ExternalFileListener() {
  const { initialize, openByPath } = useEditorActions();
  const migrationStatus = useMigrationStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (migrationStatus !== "complete") return;
    let disposed = false;
    let ready = false;
    let unlisten: (() => void) | undefined;
    let work = Promise.resolve();
    const drain = () => {
      if (!ready || disposed) return;
      work = work
        .then(async () => {
          if (disposed) return;
          const paths = await takeCliFilePaths();
          for (const path of paths) {
            if (disposed) return;
            await openByPath(path);
          }
          if (paths.length && !disposed) navigate("/");
        })
        .catch((error) => {
          useEditorStore.setState({ editorError: `Unable to open launch files: ${String(error)}` });
        });
    };

    void (async () => {
      // Register before draining: Rust keeps paths queued even before React mounts.
      unlisten = await listen("open-files", drain);
      if (disposed) {
        unlisten();
        return;
      }
      await initialize();
      ready = true;
      drain();
    })().catch((error) => {
      useEditorStore.setState({ editorError: `Unable to register file opening: ${String(error)}` });
      // Listener setup must not prevent access to the editor and its recovery data.
      if (!disposed) void initialize();
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [migrationStatus, initialize, openByPath, navigate]);

  return null;
}
