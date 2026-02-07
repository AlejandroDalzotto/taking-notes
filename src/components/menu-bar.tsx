import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useEditorActions } from "@/stores/editor";

type DropdownItem = {
  id: string;
  text: string;
  shortcut?: string;
  onClick?: () => void;
};

type DropdownMenuProps = {
  text: string;
  items: DropdownItem[];
  // optional id for testing or keys
  id?: string;
};

/**
 * A single menu button which toggles a dropdown when clicked.
 * - Clicking the title toggles the menu open/close.
 * - Clicking outside closes the menu.
 * - No animations or transitions are used.
 */
const Menu: React.FC<DropdownMenuProps> = ({ text, items, id }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={containerRef} className="relative" id={id}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-neutral-100 cursor-pointer relative text-sm py-0.5 px-1"
        aria-expanded={open}
        aria-haspopup="menu"
        type="button"
      >
        {text}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${text} menu`}
          className="absolute top-full left-0 min-w-40 bg-neutral-900 border border-neutral-800 rounded z-50"
        >
          {items.map((item) => (
            <div
              key={item.id}
              role="menuitem"
              onClick={() => {
                try {
                  item.onClick?.();
                } finally {
                  // Close after click
                  setOpen(false);
                }
              }}
              className="px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer flex justify-between items-center"
            >
              <span>{item.text}</span>
              {item.shortcut && <span className="text-xs text-neutral-400 ml-4">{item.shortcut}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * A smaller component to render an inline single-purpose button in the menu bar.
 * This is used for the "Recent" quick button requested by the user.
 */
const InlineButton: React.FC<{
  text: string;
  onClick?: () => void;
  title?: string;
}> = ({ text, onClick, title }) => {
  return (
    <button onClick={onClick} title={title ?? text} className="text-neutral-100 cursor-pointer relative text-sm py-0.5 px-1" type="button">
      {text}
    </button>
  );
};

export default function MenuBar() {
  const { addBlank, openLocalFile, saveCurrentFileOnDisk } = useEditorActions();
  const navigate = useNavigate();

  const fileItems: DropdownItem[] = [
    { id: "new", text: "New", shortcut: "Ctrl+N", onClick: addBlank },
    { id: "open", text: "Open", shortcut: "Ctrl+O", onClick: openLocalFile },
    {
      id: "open-recent",
      text: "Open Recent",
      shortcut: undefined,
      onClick: () => navigate("/recent-files"),
    },
    { id: "save", text: "Save", shortcut: "Ctrl+S", onClick: saveCurrentFileOnDisk },
  ];

  const editItems: DropdownItem[] = [
    {
      id: "undo",
      text: "Undo",
      shortcut: "Ctrl+Z",
      onClick: () => {
        // Native undo in textareas usually works, but expose command for clicks.
        try {
          document.execCommand("undo");
        } catch {
          // noop
        }
      },
    },
    {
      id: "redo",
      text: "Redo",
      shortcut: "Ctrl+Shift+Z",
      onClick: () => {
        try {
          document.execCommand("redo");
        } catch {
          // noop
        }
      },
    },
  ];

  const viewItems: DropdownItem[] = [
    { id: "zoom-in", text: "Zoom In", onClick: () => window.dispatchEvent(new CustomEvent("zoom-in")) },
    { id: "zoom-out", text: "Zoom Out", onClick: () => window.dispatchEvent(new CustomEvent("zoom-out")) },
  ];

  const helpItems: DropdownItem[] = [
    {
      id: "docs",
      text: "Documentation",
      onClick: () => {
        // open docs in a new window/tab - leave implementation simple
        window.open("https://tauri.app", "_blank", "noopener,noreferrer");
      },
    },
    {
      id: "about",
      text: "About",
      onClick: () => window.alert(`Taking Notes\n\nDesktop application\n\nVersion information is available in the app's About dialog.`),
    },
  ];

  return (
    <div className="h-8 bg-neutral-950 border-y border-neutral-800 px-2 select-none flex items-center gap-x-4">
      <Menu text="file" items={fileItems} id="menu-file" />
      <Menu text="edit" items={editItems} id="menu-edit" />
      <Menu text="view" items={viewItems} id="menu-view" />
      <Menu text="help" items={helpItems} id="menu-help" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick access to Recent files (separate dedicated button) */}
      <InlineButton text="Recent" onClick={() => navigate("/recent-files")} title="Open recent files" />
    </div>
  );
}
