import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor";

export default function SessionSaver() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let changed = false;
    const save = () => {
      clearTimeout(timer);
      timer = undefined;
      const state = useEditorStore.getState();
      if (!changed || !state.isInitialized || state.initializationError) return;
      changed = false;
      void state.actions.persistSession().catch(() => {
        // The store surfaces the error; retry on the next interval or edit.
        changed = true;
      });
    };
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (!state.isInitialized || state.initializationError) return;
      if (state.activeContent === previous.activeContent && state.tabs === previous.tabs
        && state.currentTabId === previous.currentTabId && state.recentFiles === previous.recentFiles) return;
      changed = true;
      clearTimeout(timer);
      timer = setTimeout(save, 1000);
    });
    // Continuous typing should still produce a recovery snapshot periodically.
    const interval = setInterval(save, 10000);
    return () => { unsubscribe(); clearTimeout(timer); clearInterval(interval); };
  }, []);
  return null;
}
