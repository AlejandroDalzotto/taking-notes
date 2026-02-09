import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useEditorActions } from "@/stores/editor";
import { message } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";

type DropdownItem = {
  id: string;
  text: string;
  shortcut?: string;
  onClick?: () => void;
  available: boolean;
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
              aria-disabled={!item.available}
              onClick={() => {
                try {
                  item.onClick?.();
                } finally {
                  // Close after click
                  setOpen(false);
                }
              }}
              className={clsx(
                "px-4 py-2 text-sm flex justify-between items-center",
                !item.available && "opacity-50 cursor-not-allowed pointer-events-none text-neutral-400",
                item.available && "cursor-pointer text-neutral-200 hover:bg-neutral-800 hover:text-white",
              )}
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
    { id: "new", text: "New", shortcut: "Ctrl+N", onClick: addBlank, available: true },
    { id: "open", text: "Open", shortcut: "Ctrl+O", onClick: openLocalFile, available: true },
    {
      id: "open-recent",
      text: "Open Recent",
      shortcut: undefined,
      onClick: () => navigate("/recent-files"),
      available: true,
    },
    { id: "save", text: "Save", shortcut: "Ctrl+S", onClick: saveCurrentFileOnDisk, available: true },
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
      available: false,
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
      available: false,
    },
  ];

  const viewItems: DropdownItem[] = [
    { id: "zoom-in", text: "Zoom In", onClick: () => window.dispatchEvent(new CustomEvent("zoom-in")), available: false },
    { id: "zoom-out", text: "Zoom Out", onClick: () => window.dispatchEvent(new CustomEvent("zoom-out")), available: false },
  ];

  const helpItems: DropdownItem[] = [
    {
      id: "docs",
      text: "Documentation",
      onClick: () => {
        // open docs in a new window/tab - leave implementation simple
        window.open("https://tauri.app", "_blank", "noopener,noreferrer");
      },
      available: false,
    },
    {
      id: "about",
      text: "About",
      onClick: () =>
        message(
          `
        Taking Notes v1.1.0\n
        Taking Notes is a simple note-taking application built with Tauri.\n
        It allows you to create, edit, and organize your notes in a simple and intuitive way.\n
        ©Copyright 2026 - Made by Alejandro Dalzotto
      `,
          {
            title: "About Taking Notes",
            kind: "info",
          },
        ),
      available: true,
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
