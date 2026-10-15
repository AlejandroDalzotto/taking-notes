import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { useMigrationStatus } from "@/stores/migration";
import { useEditorActions, useEditorStore } from "@/stores/editor";

export default function WindowControls() {
  const { persistSession } = useEditorActions();
  const migrationStatus = useMigrationStatus();
  const closing = useRef(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlisten = appWindow.onCloseRequested((event) => {
      // Tauri doesn't wait for an async handler before destroying the window.
      event.preventDefault();
      if (closing.current) return;
      closing.current = true;
      void (async () => {
        try {
          const state = useEditorStore.getState();
          if (migrationStatus !== "complete" || state.initializationError) {
            const confirmed = await ask("Session recovery is not available. Save any new work to a file before exiting. Close without changing the existing recovery data?", {
              title: "Close Taking Notes?", kind: "warning", okLabel: "Close without recovery", cancelLabel: "Keep open",
            });
            if (!confirmed) { closing.current = false; return; }
          } else {
            await persistSession();
          }
          await appWindow.destroy();
        } catch (error) {
          useEditorStore.setState({ editorError: `The window stayed open to protect your notes. ${String(error)}` });
          closing.current = false;
        }
      })();
    });
    return () => { void unlisten.then((dispose) => dispose()).catch(console.error); };
  }, [persistSession, migrationStatus]);

  const run = (action: "minimize" | "toggleMaximize" | "close") => {
    void getCurrentWindow()[action]().catch((error) => {
      useEditorStore.setState({ editorError: `Window action failed: ${String(error)}` });
    });
  };

  return (
    <div className="window-controls">
      <button className="window-control" onClick={() => run("minimize")} aria-label="Minimize window" title="Minimize"><Minus size={14} /></button>
      <button className="window-control" onClick={() => run("toggleMaximize")} aria-label="Maximize or restore window" title="Maximize / restore"><Square size={12} /></button>
      <button className="window-control window-close" onClick={() => run("close")} aria-label="Close window" title="Close"><X size={16} /></button>
    </div>
  );
}
