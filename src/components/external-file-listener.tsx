import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorActions } from "@/stores/editor";
import { useNavigate } from "react-router";

/**
 * Invisible component that listens for the `open-files` event emitted by
 * the Rust single-instance plugin when a second instance of the app is
 * launched (e.g. the user right-clicks a file and chooses "Open with
 * Taking Notes" while the app is already running).
 *
 * The single-instance plugin prevents the second instance from starting
 * and forwards its CLI arguments to the running instance via this event.
 */
export default function ExternalFileListener() {
  const { openByPath } = useEditorActions();
  const navigate = useNavigate();

  useEffect(() => {
    const unlisten = listen<string[]>("open-files", async (event) => {
      const paths = event.payload;
      if (paths.length === 0) return;

      for (const path of paths) {
        await openByPath(path);
      }

      // Navigate to the editor so the newly opened file is visible.
      navigate("/");
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return null;
}
