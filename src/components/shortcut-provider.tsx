import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useEditorActions } from "@/stores/editor";

function normalizeShortcut(e: KeyboardEvent) {
  const keys = [];

  if (e.ctrlKey) keys.push("ctrl");
  if (e.metaKey) keys.push("meta");
  if (e.altKey) keys.push("alt");
  if (e.shiftKey) keys.push("shift");

  keys.push(e.key.toLowerCase());

  return keys.join("+");
}

export default function GlobalShortcutProvider() {
  const { addBlank, openLocalFile, saveCurrentFileOnDisk, closeCurrentTab } = useEditorActions();
  const navigate = useNavigate();

  /**
   * List of shortcuts:
   * - Ctrl+T: Add a new blank file
   * - Ctrl+O: Open a local file
   * - Ctrl+S: Save the current file on disk
   * - Ctrl+W: Close the current tab
   */
  const shortcuts: Record<string, () => void> = {
    "ctrl+t": () => {
      addBlank();
      navigate("/");
    },
    "ctrl+o": () => openLocalFile(),
    "ctrl+s": () => saveCurrentFileOnDisk(),
    "ctrl+w": () => closeCurrentTab(),
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = normalizeShortcut(e);
      const handler = shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
