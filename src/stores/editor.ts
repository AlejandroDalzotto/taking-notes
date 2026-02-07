import { save as tauriSave, open as tauriOpen, ask } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { DatabaseV2, LocalFile, SessionTab, Tab, TabType } from "@/lib/types";
import { deserializeTabs, loadEditorState, openFile, saveEditorState, saveFile, serializeTabs } from "@/lib/commands";
import { useShallow } from "zustand/shallow";

type State = {
  tabs: Tab[];
  current: Tab | null;
  recentFiles: Record<string, LocalFile>;
  isInitialized: boolean;
};

type Actions = {
  initialize: () => Promise<void>;
  persistSession: () => Promise<void>;
  addBlank: () => void;
  setContent: (content: string) => void;
  saveCurrentFileOnDisk: () => Promise<void>;
  openLocalFile: () => Promise<void>;
  openByPath: (path: string) => Promise<void>;
  openTab: (id: string) => Promise<void>;
  closeTab: (id: string, options?: { skipConfirmation?: boolean }) => Promise<boolean>;
  closeCurrentTab: () => Promise<boolean>;
  resetCurrent: () => void;
};

const useEditorStore = create<State & { actions: Actions }>((set, get) => ({
  current: null,
  tabs: [],
  recentFiles: {},
  isInitialized: false,

  actions: {
    initialize: async () => {
      try {
        const db = await loadEditorState();
        const loadedTabs: Tab[] = db.session.tabs.length > 0 ? deserializeTabs(db.session.tabs) : [];
        let currentTab = loadedTabs.find((t: Tab) => t.id === db.session.currentTabId) ?? null;

        if (currentTab && currentTab.type === TabType.LOCAL && !currentTab.content) {
          try {
            const content = await openFile(currentTab.path!);
            currentTab = { ...currentTab, content }; // ✅ Inmutable
          } catch (error) {
            console.error("Failed to load current tab content:", error);
          }
        }

        set({
          tabs: loadedTabs,
          current: currentTab,
          recentFiles: db.recentFiles,
          isInitialized: true,
        });
      } catch (error) {
        console.error("Failed to initialize editor:", error);
        set({ isInitialized: true });
      }
      console.log("============= Editor initialized =============");
    },

    persistSession: async () => {
      const { tabs, current, recentFiles } = get();
      const sessionTabs: SessionTab[] = serializeTabs(tabs);
      const db: DatabaseV2 = {
        recentFiles,
        session: {
          tabs: sessionTabs,
          currentTabId: current?.id,
        },
        schemaVersion: "V2",
      };

      try {
        await saveEditorState(db);
      } catch (error) {
        console.error("Failed to persist session:", error);
      }
    },

    addBlank: () => {
      const id = crypto.randomUUID();
      const blank: Tab = {
        id,
        type: TabType.UNTITLED,
        content: "",
        isDirty: false,
        filename: "untitled",
        path: undefined,
      };

      set((state) => ({
        tabs: [...state.tabs, blank],
        current: blank,
      }));
    },

    setContent: (content: string) => {
      const { current, tabs } = get();
      if (!current) return;

      const updatedCurrent = { ...current, content, isDirty: true };
      const updatedTabs = tabs.map((t) => (t.id === current.id ? updatedCurrent : t));

      set({ current: updatedCurrent, tabs: updatedTabs });
    },

    saveCurrentFileOnDisk: async () => {
      const { current, tabs, recentFiles } = get();
      if (!current) return;

      try {
        let pathToSave = current.path;

        if (current.type === TabType.UNTITLED) {
          const selectedPath = await tauriSave({
            defaultPath: "Untitled",
            filters: [
              { name: "Text Files", extensions: ["txt"] },
              { name: "All Files", extensions: ["*"] },
            ],
          });

          if (!selectedPath) return;
          pathToSave = selectedPath;
        }

        if (!pathToSave) return;
        await saveFile(pathToSave, current.content ?? "");

        const filename = pathToSave.split(/[\\/]/).pop() || "Untitled";

        const updatedTab = {
          ...current,
          type: TabType.LOCAL,
          filename,
          path: pathToSave,
          isDirty: false,
        };

        set({
          current: updatedTab,
          tabs: tabs.map((t) => (t.id === current.id ? updatedTab : t)),
          recentFiles: {
            ...recentFiles,
            [pathToSave]: {
              id: current.id,
              filename,
              path: pathToSave,
              modified: Date.now(),
            },
          },
        });
      } catch (error) {
        console.error("Error saving file:", error);
      }
    },

    openLocalFile: async () => {
      const path = await tauriOpen({
        title: "Open File",
        filters: [
          {
            name: "Text based files",
            extensions: ["txt", "md", "json", "html", "css", "js", "ts", "csv", "py", "rs"],
          },
        ],
      });

      if (!path) return;
      await get().actions.openByPath(path);
    },

    openByPath: async (path: string) => {
      const { tabs, recentFiles } = get();
      let existingTab = tabs.find((t) => t.path === path);

      if (existingTab) {
        if (existingTab.type === TabType.LOCAL) {
          const content = await openFile(path);
          existingTab = { ...existingTab, content };
        }
        set({ current: existingTab });
        return;
      }

      try {
        const content = await openFile(path);
        const filename = path.split(/[\\/]/).pop() || path;

        const newTab: Tab = {
          id: crypto.randomUUID(),
          filename,
          path,
          content,
          isDirty: false,
          type: TabType.LOCAL,
        };

        set({
          tabs: [...tabs, newTab],
          current: newTab,
          recentFiles: {
            ...recentFiles,
            [path]: {
              id: newTab.id,
              filename,
              path,
              modified: Date.now(),
            },
          },
        });
      } catch (error) {
        console.error("Error opening file:", error);
      }
    },

    openTab: async (id: string) => {
      const { tabs, current } = get();
      if (current?.id === id) return;

      const tabToOpen = tabs.find((t) => t.id === id);
      if (!tabToOpen) return;

      let updatedTab = tabToOpen;

      // Cargar contenido si es necesario
      if (tabToOpen.type === TabType.LOCAL && !tabToOpen.content) {
        try {
          const content = await openFile(tabToOpen.path!);
          updatedTab = { ...tabToOpen, content };
        } catch (error) {
          console.error("Error loading file:", error);
          return;
        }
      }

      const updatedTabs = tabs.map((t) => {
        if (t.id === id) return updatedTab;
        if (current && t.id === current.id && t.type === TabType.LOCAL && !t.isDirty) {
          return { ...t, content: undefined };
        }
        return t;
      });

      set({ tabs: updatedTabs, current: updatedTab });
    },

    closeTab: async (id: string, options = {}) => {
      const { tabs, current, actions } = get();
      const tabToClose = tabs.find((t) => t.id === id);

      if (!tabToClose) return true;

      if (tabToClose.isDirty && !options.skipConfirmation) {
        const userChoice = await ask(`"${tabToClose.filename}" has unsaved changes. Do you want to save before closing?`, {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Save",
          cancelLabel: "Don't Save",
        });

        if (userChoice === null) return false;

        if (userChoice === true) {
          if (tabToClose.id === current?.id) {
            await actions.saveCurrentFileOnDisk();
          } else if (tabToClose.type === TabType.LOCAL && tabToClose.path) {
            await saveFile(tabToClose.path, tabToClose.content ?? "");
          } else {
            await actions.openTab(id);
            await actions.saveCurrentFileOnDisk();
          }
        }
      }

      const closedIndex = tabs.findIndex((t) => t.id === id);
      const newTabs = tabs.filter((tab) => tab.id !== id);
      let newCurrent = current;

      if (current?.id === id) {
        newCurrent = newTabs[closedIndex - 1] ?? newTabs[closedIndex] ?? null;
      }

      set({ tabs: newTabs, current: newCurrent });
      return true;
    },

    closeCurrentTab: async () => {
      const { tabs, current, actions } = get();

      if (!current) return true;

      const tabToClose = tabs.find((t) => t.id === current.id);

      if (!tabToClose) return true;

      if (tabToClose.isDirty) {
        const userChoice = await ask(`"${tabToClose.filename}" has unsaved changes. Do you want to save before closing?`, {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Save",
          cancelLabel: "Don't Save",
        });

        if (userChoice === null) return false;

        if (userChoice === true) {
          await actions.saveCurrentFileOnDisk();
        }
      }

      const closedIndex = tabs.findIndex((t) => t.id === current.id);
      const newTabs = tabs.filter((tab) => tab.id !== current.id);
      let newCurrent = current;
      newCurrent = newTabs[closedIndex - 1] ?? newTabs[closedIndex] ?? null;

      set({ tabs: newTabs, current: newCurrent });
      return true;
    },

    resetCurrent() {
      set({ current: null });
    },
  },
}));

export const useCurrent = () => useEditorStore(useShallow((state) => state.current));
export const useHasTabs = () => useEditorStore(useShallow((state) => state.tabs.length > 0));
export const useIsActiveTab = (tabId: string) => useEditorStore(useShallow((state) => state.current?.id === tabId));
export const useTabs = () => useEditorStore((state) => state.tabs);
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);
export const useEditorActions = () => useEditorStore((state) => state.actions);
export const useIsInitialized = () => useEditorStore((state) => state.isInitialized);
