import React, { useEffect, useRef, useState } from "react";

type DropdownItem = {
  id: string;
  text: string;
  shortcut?: string;
  onClick?: () => void;
};

type MenuProps = {
  text: string;
  items: DropdownItem[];
  // optional className hooks for styling the trigger/button wrapper
  className?: string;
};

/**
 * Clickable Menu component
 *
 * - Opens/closes on button click (no hover behavior)
 * - Closes when clicking outside or pressing Escape
 * - Calls item's onClick handler and closes the menu
 * - No animations/transitions are applied
 *
 * This is intentionally small and focused: the parent (e.g. `MenuBar`) should
 * provide item action callbacks such as `addBlank`, `openLocalFile`, etc.
 */
export default function Menu({ text, items, className = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!containerRef.current) return;
      if (!target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onDocumentKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, []);

  // Toggle open state when trigger is clicked
  const toggle = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpen((v) => !v);
  };

  const handleItemClick = (item: DropdownItem) => {
    try {
      item.onClick?.();
    } finally {
      // always close the menu after click, even if onClick throws
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="text-neutral-100 cursor-pointer relative text-sm py-0.5 px-1"
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
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              onKeyDown={(e) => {
                // allow Enter or Space to activate the menu item
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleItemClick(item);
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
}
