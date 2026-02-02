"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { X, Plus, FileText, Circle, Minimize, Maximize } from "lucide-react";
import Image from "next/image";
import { useCurrent, useEditorActions, useTabs } from "@/stores/editor";
import type { Tab } from "@/lib/types";
import { useRouter } from "next/navigation";

// ============================================
// TabItem - Componente individual de tab (memoizado)
// ============================================
interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClose: (e: React.MouseEvent, tab: Tab) => void;
  onClick: (tabId: string) => void;
}

const TabItem = memo(function TabItem({ tab, isActive, onClose, onClick }: TabItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={tab}
      dragListener={true}
      dragControls={controls}
      transition={{
        layout: {
          duration: 0.15,
          ease: "easeOut",
        },
      }}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-md
        min-w-25 max-w-45 shrink-0
        ${isActive ? "bg-zinc-800 text-white shadow-sm" : "bg-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"}
        cursor-pointer transition-colors duration-100
      `}
      onClick={() => onClick(tab.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      <button
        onClick={(e) => onClose(e, tab)}
        className={`
          shrink-0 p-0.5 rounded hover:bg-zinc-700/70 transition-opacity duration-100
          ${isHovered || isActive ? "opacity-100" : "opacity-0"}
        `}
      >
        <X className="w-3 h-3" />
      </button>
    </Reorder.Item>
  );
});

// ============================================
// TabList - Contenedor de tabs con Reorder
// ============================================
interface TabListProps {
  tabs: Tab[];
  currentId: string | undefined;
  onReorder: (newOrder: Tab[]) => void;
  onClose: (e: React.MouseEvent, tab: Tab) => void;
  onTabClick: (tabId: string) => void;
}

const TabList = memo(function TabList({ tabs, currentId, onReorder, onClose, onTabClick }: TabListProps) {
  const isDraggingRef = useRef(false);

  const handleTabClick = useCallback(
    (tabId: string) => {
      // Evitar clicks durante el drag
      if (!isDraggingRef.current) {
        onTabClick(tabId);
      }
    },
    [onTabClick],
  );

  return (
    <Reorder.Group
      axis="x"
      values={tabs}
      onReorder={onReorder}
      className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar px-1"
      onPointerDown={() => {
        isDraggingRef.current = false;
      }}
      onDrag={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        // Pequeño delay para evitar que el click se dispare después del drag
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      }}
    >
      {tabs.map((tab) => (
        <TabItem key={tab.id} tab={tab} isActive={tab.id === currentId} onClose={onClose} onClick={handleTabClick} />
      ))}
    </Reorder.Group>
  );
});

// ============================================
// AppHeader - Componente principal
// ============================================
export default function AppHeader() {
  const current = useCurrent();
  const tabs = useTabs();
  const router = useRouter();
  const { addBlank, closeTab, openTab, reorderTabs } = useEditorActions();

  const handleCloseTab = async (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    await closeTab(tab.id);
  };

  const handleTabClick = (tabId: string) => {
    router.push("/");
    openTab(tabId);
  };

  return (
    <header className="h-10 py-1 bg-neutral-950 px-2 relative select-none grid grid-cols-[auto_1fr_auto]">
      {/* Drag region - cubre todo el header como base */}
      <div data-tauri-drag-region className="absolute inset-0 pointer-events-auto" style={{ zIndex: 0 }} />

      {/* Logo y título */}
      <div className="flex items-center gap-x-2 px-1 shrink-0 relative z-10 pointer-events-none">
        <Image className="invert" src="/icon-no-bg.png" alt="Logo" width={18} height={18} />
        {current === null && <p className="text-white text-sm font-medium">Taking Notes</p>}
      </div>

      {/* Tabs Container - z-10 para estar encima del drag region */}
      <div className="grid grid-cols-[1fr_auto] relative z-10">
        {tabs.length > 0 && current ? (
          <TabList tabs={tabs} currentId={current.id} onReorder={reorderTabs} onClose={handleCloseTab} onTabClick={handleTabClick} />
        ) : (
          // Espacio vacío con drag region cuando no hay tabs
          <div data-tauri-drag-region className="flex-1" />
        )}

        <button
          onClick={addBlank}
          className="w-fit p-1.5 mx-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
          title="Nueva nota"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Window Controls - z-10 para estar encima del drag region */}
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
    </header>
  );
}
