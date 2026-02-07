import { X, Plus, FileText, Circle } from "lucide-react";
import { useEditorActions, useHasTabs, useIsActiveTab, useTabs } from "@/stores/editor";
import { memo } from "react";
import { Tab } from "@/lib/types";
import WindowControls from "@/components/window-controls";
import { useNavigate } from "react-router";

const AppTitle = () => {
  const hasTabs = useHasTabs();
  if (hasTabs) return null;

  return <p className="text-white text-sm font-medium">Taking Notes</p>;
};

const AddTabButton = () => {
  const { addBlank } = useEditorActions();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        addBlank();
        navigate("/");
      }}
      className="w-fit p-1.5 mx-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
      title="Nueva nota"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  );
};

const CloseTabButton = ({ tabId }: { tabId: string }) => {
  const { closeTab } = useEditorActions();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        closeTab(tabId);
      }}
      className="shrink-0 p-0.5 rounded hover:bg-zinc-700/70"
    >
      <X className="w-3 h-3" />
    </button>
  );
};

const TabItem = memo(function TabItem({ tab }: { tab: Tab }) {
  const { openTab } = useEditorActions();
  const isActive = useIsActiveTab(tab.id);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        openTab(tab.id);
        navigate("/");
      }}
      key={tab.id}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-md
        min-w-25 max-w-45 shrink-0
        ${isActive ? "bg-zinc-800 text-white shadow-sm" : "bg-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"}
        cursor-pointer transition-colors duration-100
      `}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs truncate font-medium">{tab.filename}</span>

        {tab.isDirty && (
          <div className="shrink-0">
            <Circle className="w-1.5 h-1.5 fill-blue-400 text-blue-400" />
          </div>
        )}
      </div>

      <CloseTabButton tabId={tab.id} />
    </div>
  );
});

const TabList = () => {
  const tabs = useTabs();
  return (
    <>
      {tabs.length > 0 ? (
        <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar px-1">
          {tabs.map((tab) => {
            return <TabItem tab={tab} key={tab.id} />;
          })}
        </div>
      ) : (
        // Espacio vacío con drag region cuando no hay tabs
        <div data-tauri-drag-region className="flex-1" />
      )}
    </>
  );
};

export default function AppHeader() {
  return (
    <header className="h-10 py-1 bg-neutral-950 px-2 relative select-none grid grid-cols-[auto_1fr_auto]">
      {/* Drag region - cubre todo el header como base */}
      <div data-tauri-drag-region className="absolute inset-0 pointer-events-auto" style={{ zIndex: 0 }} />

      {/* Logo y título */}
      <div className="flex items-center gap-x-2 px-1 shrink-0 relative z-10 pointer-events-none">
        <img src="/icon-no-bg.png" alt="Logo" className="w-6 h-6 invert" />
        <AppTitle />
      </div>

      {/* Tabs Container - z-10 para estar encima del drag region */}
      <div className="grid grid-cols-[1fr_auto] relative z-10">
        <TabList />

        <AddTabButton />
      </div>

      {/* Window Controls - z-10 para estar encima del drag region */}
      <WindowControls />
    </header>
  );
}
