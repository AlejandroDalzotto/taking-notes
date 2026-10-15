import { useState } from "react";
import { useNavigate } from "react-router";
import { getVersion } from "@tauri-apps/api/app";
import { message } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import { useCurrentTabMeta, useEditorActions } from "@/stores/editor";
import { useFontSize, useSettingsActions } from "@/stores/settings";
import Menu, { type DropdownItem } from "@/components/menu";
import { useCheckForUpdates, useUpdaterStatus } from "@/stores/updater";

export default function MenuBar() {
  const { addBlank, openLocalFile, saveCurrentFileOnDisk, closeCurrentTab } = useEditorActions();
  const { toggleSidebar, increaseEditorFontSize, decreaseEditorFontSize, resetFontSize } = useSettingsActions();
  const currentTab = useCurrentTabMeta();
  const fontSize = useFontSize();
  const checkForUpdates = useCheckForUpdates();
  const updateStatus = useUpdaterStatus();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const action = (label: string, run: () => unknown) => async () => {
    setError(null);
    try {
      await run();
    } catch (cause) {
      setError(`${label}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  };

  const fileItems: DropdownItem[] = [
    {
      id: "new",
      text: "New note",
      shortcut: "Ctrl+N",
      onClick: action("Unable to create note", () => {
        addBlank();
        navigate("/");
      }),
    },
    {
      id: "open",
      text: "Open file…",
      shortcut: "Ctrl+O",
      onClick: action("Unable to open file", async () => {
        await openLocalFile();
        navigate("/");
      }),
    },
    { id: "recent", text: "Recent files", onClick: () => navigate("/recent-files") },
    ...(currentTab ? [
      {
        id: "save",
        text: "Save",
        shortcut: "Ctrl+S",
        separatorBefore: true,
        onClick: action("Unable to save file", saveCurrentFileOnDisk),
      },
      {
        id: "close",
        text: "Close note",
        shortcut: "Ctrl+W",
        onClick: action("Unable to close note", closeCurrentTab),
      },
    ] : []),
  ];

  const viewItems: DropdownItem[] = [
    { id: "sidebar", text: "Toggle sidebar", shortcut: "Ctrl+B", onClick: action("Unable to toggle sidebar", toggleSidebar) },
    {
      id: "font-increase",
      text: "Increase text size",
      separatorBefore: true,
      onClick: action("Unable to change text size", () => increaseEditorFontSize(1)),
    },
    {
      id: "font-decrease",
      text: "Decrease text size",
      onClick: action("Unable to change text size", () => decreaseEditorFontSize(1)),
    },
    { id: "font-reset", text: "Reset text size", detail: `${fontSize} px`, onClick: action("Unable to reset text size", resetFontSize) },
  ];

  const helpItems: DropdownItem[] = [
    {
      id: "updates",
      text: "Check for updates…",
      detail: "Uses internet",
      onClick: action("Unable to check for updates", checkForUpdates),
    },
    {
      id: "about",
      text: "About Taking Notes",
      onClick: action("Unable to show app information", async () => {
        const version = await getVersion();
        await message(`Taking Notes ${version}\n\nA quiet place for your plain-text notes.\nMade by Alejandro Dalzotto.`, {
          title: "About Taking Notes",
          kind: "info",
        });
      }),
    },
  ];

  return (
    <nav
      aria-label="Application menu"
      className="relative flex h-11 shrink-0 select-none items-center gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-[var(--color-text-secondary)]"
    >
      <Menu text="File" items={fileItems} />
      <Menu text="View" items={viewItems} />
      <Menu text="Help" items={helpItems} />
      <span role="status" className="ml-auto pr-1 text-[10px] tracking-wide text-[var(--color-text-muted)]">{updateStatus === "checking" ? "Checking for updates…" : updateStatus === "downloading" ? "Installing update…" : "Plain text"}</span>
      {error && (
        <div role="alert" className="absolute right-3 top-full z-50 mt-2 flex max-w-sm items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs text-[var(--color-danger)] shadow-lg">
          <p className="min-w-0 break-words">{error}</p>
          <button type="button" className="icon-button shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]" aria-label="Dismiss menu error" onClick={() => setError(null)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
