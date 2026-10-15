import { PanelLeft } from "lucide-react";
import { useCurrentTabMeta } from "@/stores/editor";
import { useSettingsActions, useSidebarOpen } from "@/stores/settings";
import WindowControls from "@/components/window-controls";
import { useLocation } from "react-router";

export default function AppHeader() {
  const { toggleSidebar } = useSettingsActions();
  const sidebarOpen = useSidebarOpen();
  const currentTab = useCurrentTabMeta();
  const { pathname } = useLocation();

  return (
    <header className="flex h-12 shrink-0 select-none items-center border-b border-line bg-surface text-ink">
      <div className="flex shrink-0 items-center gap-2 pl-3 sm:gap-3">
        <button className="icon-button" onClick={toggleSidebar} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-expanded={sidebarOpen} aria-controls="notes-sidebar" title="Toggle sidebar (Ctrl+B)">
          <PanelLeft size={17} />
        </button>
        <img src="/icon.png" className="w-5 h-5 select-none pointer-events-none" />
        <span data-tauri-drag-region className="whitespace-nowrap text-[13px] font-medium tracking-tight">Taking Notes<span className="text-accent">.</span></span>
      </div>
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center justify-center px-5">
        <span className="hidden truncate text-[11px] tracking-wide text-muted sm:block" data-tauri-drag-region>
          {pathname === "/recent-files" ? "Recent files" : currentTab?.filename ?? "A little room to think"}
          {pathname === "/" && currentTab?.isDirty && " ·"}
        </span>
      </div>
      <WindowControls />
    </header>
  );
}
