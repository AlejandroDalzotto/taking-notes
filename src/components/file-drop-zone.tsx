import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorActions } from "@/stores/editor";
import { useNavigate } from "react-router";
import { FileUp } from "lucide-react";

export default function FileDropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const { openByPath } = useEditorActions();
  const navigate = useNavigate();

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlisten = appWindow.onDragDropEvent(async (event) => {
      if (event.payload.type === "enter") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);

        const paths = event.payload.paths;
        if (paths.length > 0) {
          for (const path of paths) {
            await openByPath(path);
          }
          navigate("/");
        }
      }
      // "over" events are ignored — we only care about enter/leave/drop
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-50 p-1 pointer-events-none">
      <div className="w-full h-full rounded-xl backdrop-blur-sm bg-white/5 border-2 border-dashed border-blue-400/30 flex flex-col items-center justify-center gap-3">
        <div className="p-4 rounded-full bg-blue-500/10 border border-blue-400/20">
          <FileUp className="w-8 h-8 text-blue-400/80" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-white/90">Open file</p>
          <p className="text-sm text-neutral-400 mt-1">Drop to open in a new tab</p>
        </div>
      </div>
    </div>
  );
}
