import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minimize, Maximize, X } from "lucide-react";
import { useEffect } from "react";
import { useEditorActions } from "@/stores/editor";

export default function WindowControls() {
  const { persistSession } = useEditorActions();

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close();

    document.getElementById("titlebar-minimize")?.addEventListener("click", handleMinimize);
    document.getElementById("titlebar-maximize")?.addEventListener("click", handleMaximize);
    document.getElementById("titlebar-close")?.addEventListener("click", handleClose);

    const unlisten = appWindow.onCloseRequested(async () => {
      await persistSession();
    });

    return () => {
      document.getElementById("titlebar-minimize")?.removeEventListener("click", handleMinimize);
      document.getElementById("titlebar-maximize")?.removeEventListener("click", handleMaximize);
      document.getElementById("titlebar-close")?.removeEventListener("click", handleClose);
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div className="relative z-10">
      <div className="flex gap-x-2 ml-2 shrink-0">
        <button
          id="titlebar-minimize"
          className="appearance-none inline-flex justify-center items-center w-7 h-7 bg-transparent hover:bg-white/10 rounded  hover:text-neutral-50 text-neutral-300 active:scale-90 hover:scale-105"
          title="minimize"
          style={{
            transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
          }}
        >
          <Minimize className="w-3.5 h-3.5" />
        </button>
        <button
          id="titlebar-maximize"
          title="maximize"
          style={{
            transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
          }}
          className="appearance-none inline-flex justify-center items-center w-7 h-7 bg-transparent hover:bg-white/10 rounded hover:text-neutral-50 text-neutral-300 active:scale-90 hover:scale-105"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
        <button
          id="titlebar-close"
          title="close"
          style={{
            transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
          }}
          className="appearance-none inline-flex justify-center items-center w-7 h-7 bg-transparent hover:bg-red-500/10 rounded hover:text-red-500 text-neutral-300 active:scale-90 hover:scale-105"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
