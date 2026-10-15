import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import { useEditorActions, useEditorStore, useIsInitialized } from "@/stores/editor";
import { useNavigate } from "react-router";
import { FileUp } from "lucide-react";

export default function FileDropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const { openByPath } = useEditorActions();
  const initialized = useIsInitialized();
  const navigate = useNavigate();
  const pending = useRef<string[]>([]);
  const work = useRef(Promise.resolve());

  useEffect(() => {
    let disposed = false;
    const drain = () => {
      if (!useEditorStore.getState().isInitialized) return;
      work.current = work.current.then(async () => {
        if (disposed) return;
        const paths = pending.current.splice(0);
        for (const path of paths) await openByPath(path);
        if (paths.length && !disposed) navigate("/");
      }).catch((error) => {
        useEditorStore.setState({ editorError: `Unable to open dropped files: ${String(error)}` });
      });
    };
    drain();
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      switch (event.payload.type) {
        case "enter":
        case "over": setIsDragOver(true); break;
        case "leave": setIsDragOver(false); break;
        case "drop":
          setIsDragOver(false);
          pending.current.push(...event.payload.paths);
          drain();
          break;
      }
    });
    // Prevent the webview from navigating to dropped files if native handling fails.
    const preventNavigation = (event: DragEvent) => { event.preventDefault(); };
    window.addEventListener("dragover", preventNavigation);
    window.addEventListener("drop", preventNavigation);
    return () => {
      disposed = true;
      void unlisten.then((dispose) => dispose()).catch(console.error);
      window.removeEventListener("dragover", preventNavigation);
      window.removeEventListener("drop", preventNavigation);
    };
  }, [initialized, openByPath, navigate]);

  return (
    <AnimatePresence>
      {isDragOver && <motion.div className="drop-overlay" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <div className="drop-card"><FileUp size={32} strokeWidth={1} /><p className="eyebrow">ROOM FOR ONE MORE THOUGHT</p><h2>Drop to open.</h2><p>Your text files. Right at home.</p></div>
      </motion.div>}
    </AnimatePresence>
  );
}
