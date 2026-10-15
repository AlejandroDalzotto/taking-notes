import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useEditorActions } from "@/stores/editor";
import { useSettingsActions } from "@/stores/settings";
import { useUpdaterStatus } from "@/stores/updater";

export default function ShortcutProvider() {
  const { addBlank, openLocalFile, saveCurrentFileOnDisk, closeCurrentTab } = useEditorActions();
  const { toggleSidebar, increaseEditorFontSize, decreaseEditorFontSize, resetFontSize } = useSettingsActions();
  const navigate = useNavigate();
  const updateStatus = useUpdaterStatus();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (updateStatus === "downloading" || !(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing) return;
      const key = event.key.toLowerCase();
      if (event.shiftKey && !["+", "="].includes(key)) return;
      switch (key) {
        case "n":
        case "t": event.preventDefault(); addBlank(); navigate("/"); break;
        case "o": event.preventDefault(); navigate("/"); void openLocalFile(); break;
        case "s": event.preventDefault(); void saveCurrentFileOnDisk(); break;
        case "w": event.preventDefault(); void closeCurrentTab(); break;
        case "b": event.preventDefault(); toggleSidebar(); break;
        case "+":
        case "=": event.preventDefault(); increaseEditorFontSize(1); break;
        case "-": event.preventDefault(); decreaseEditorFontSize(1); break;
        case "0": event.preventDefault(); resetFontSize(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addBlank, openLocalFile, saveCurrentFileOnDisk, closeCurrentTab, toggleSidebar, increaseEditorFontSize, decreaseEditorFontSize, resetFontSize, navigate, updateStatus]);

  return null;
}
