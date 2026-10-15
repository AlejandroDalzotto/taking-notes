import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

export type DropdownItem = {
  id: string;
  text: string;
  shortcut?: string;
  detail?: string;
  onClick: () => void;
  separatorBefore?: boolean;
};

type MenuProps = {
  text: string;
  items: DropdownItem[];
  className?: string;
};

export default function Menu({ text, items, className = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<"first" | "last">("first");
  const typeahead = useRef({ text: "", time: 0 });

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']");
    const index = initialFocus.current === "last" ? (buttons?.length ?? 1) - 1 : 0;
    buttons?.[index]?.focus();
    typeahead.current = { text: "", time: 0 };

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []);
    const index = buttons.findIndex((button) => button === document.activeElement);
    if (!buttons.length) return;

    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % buttons.length; break;
      case "ArrowUp": next = (index - 1 + buttons.length) % buttons.length; break;
      case "Home": next = 0; break;
      case "End": next = buttons.length - 1; break;
      case "Tab":
        close();
        return;
      case "ArrowLeft":
      case "ArrowRight": {
        const triggers = Array.from(containerRef.current?.closest("nav")?.querySelectorAll<HTMLButtonElement>("[data-menu-trigger]") ?? []);
        const current = triggers.findIndex((trigger) => trigger === triggerRef.current);
        if (triggers.length > 1 && current !== -1) {
          event.preventDefault();
          setOpen(false);
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const trigger = triggers[(current + direction + triggers.length) % triggers.length];
          trigger.focus();
          trigger.click();
        }
        return;
      }
      default: {
        if (event.key.length !== 1 || event.key === " " || event.ctrlKey || event.metaKey || event.altKey) return;
        const now = Date.now();
        const previous = now - typeahead.current.time < 500 ? typeahead.current.text : "";
        const query = previous + event.key.toLocaleLowerCase();
        typeahead.current = { text: query, time: now };
        const prefix = [...query].every((letter) => letter === query[0]) ? query[0] : query;
        for (let offset = 1; offset <= items.length; offset++) {
          const candidate = (index + offset) % items.length;
          if (items[candidate].text.toLocaleLowerCase().startsWith(prefix)) {
            next = candidate;
            break;
          }
        }
      }
    }
    if (next !== undefined) {
      event.preventDefault();
      buttons[next]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        data-menu-trigger
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        className="quiet-button rounded-md px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        style={open ? { backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-primary)" } : undefined}
        onClick={() => {
          initialFocus.current = "first";
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            initialFocus.current = event.key === "ArrowUp" ? "last" : "first";
            setOpen(true);
          }
        }}
      >
        {text}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={`${id}-menu`}
            role="menu"
            aria-labelledby={`${id}-trigger`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onKeyDown={handleMenuKeyDown}
            className="absolute left-0 top-full z-50 mt-1 min-w-60 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-primary)] shadow-lg"
          >
            {items.map((item) => (
              <div key={item.id} role="none">
                {item.separatorBefore && <div role="separator" className="mx-2 my-1.5 border-t border-[var(--color-border)]" />}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    close();
                    item.onClick();
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-6 rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <span>{item.text}</span>
                  {(item.shortcut || item.detail) && (
                    <span className="whitespace-nowrap text-[10px] text-[var(--color-text-muted)]">{item.shortcut ?? item.detail}</span>
                  )}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
