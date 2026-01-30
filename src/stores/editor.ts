import { openFile, saveFile } from "@/lib/commands";
import { Tab, DatabaseV2, LocalFile, SessionTab, TabType } from "@/lib/types";
import { save as tauriSave, open as tauriOpen, ask } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { loadEditorState, saveEditorState, serializeTabs, deserializeTabs } from "@/lib/commands";

type State = {
  tabs: Tab[];
  current: Tab | null;
  recentFiles: Record<string, LocalFile>;
  isInitialized: boolean;
  actions: {
    initialize: () => Promise<void>; // ✓
    persistSession: () => Promise<void>; // ✓
    addBlank: () => void; // ✓
    setContent: (content: string) => void; // ✓
    saveCurrentFileOnDisk: () => Promise<void>; // ✓
    openLocalFile: () => Promise<void>; // ✓
    openByPath: (path: string) => Promise<void>; // ✓
    openTab: (id: string) => Promise<void>; // ✓
    closeTab: (id: string, options?: { skipConfirmation?: boolean }) => Promise<boolean>; // ✓
    reorderTabs: (newTabs: Tab[]) => void; // ✓
  };
};

const useEditorStore = create<State>()((set, get) => ({
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
        if (currentTab && currentTab.type === TabType.LOCAL && (currentTab.content === null || currentTab.content === undefined)) {
          try {
            const content = await openFile(currentTab.path!);
            currentTab.content = content;
          } catch (error) {
            console.error("Failed to load current tab content on local type:", error);
          }
        }

        set({
          tabs: loadedTabs,
          current: currentTab,
          recentFiles: db.recentFiles || {},
          isInitialized: true,
        });
      } catch (error) {
        console.error("Failed to initialize editor:", error);
        set({ isInitialized: true });
      }
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
      set((old) => ({
        current: blank,
        tabs: [...old.tabs, blank],
      }));
    },

    setContent: (content: string) =>
      set((old) => {
        if (!old.current) return {};

        const updatedTab = { ...old.current, content, isDirty: true };

        return {
          current: updatedTab,
          tabs: old.tabs.map((tab) => (tab.id === old.current!.id ? updatedTab : tab)),
        };
      }),

    saveCurrentFileOnDisk: async () => {
      const current = get().current;
      if (!current) return;

      try {
        let pathToSave = current.path;

        // Si es untitled, pedir path al usuario
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

        // Guardar archivo
        if (!pathToSave) return;
        await saveFile(pathToSave, current.content ?? "");

        // Actualizar estado
        const filename = pathToSave.split(/[\\/]/).pop() || "Untitled";
        const savedTab: Tab = {
          ...current,
          type: TabType.LOCAL,
          filename,
          path: pathToSave,
          isDirty: false,
        };

        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === current.id ? savedTab : tab)),
          current: savedTab,
          recentFiles: {
            ...state.recentFiles,
            [pathToSave]: {
              id: current.id,
              filename,
              path: pathToSave,
              modified: Date.now(),
            },
          },
        }));
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
      const tabs = get().tabs;

      let existingTab = tabs.find((t) => t.path === path);
      if (existingTab) {
        if (existingTab.type === TabType.LOCAL) {
          existingTab.content = await openFile(path);
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

        set((old) => ({
          tabs: [...old.tabs, newTab],
          current: newTab,
          recentFiles: {
            ...old.recentFiles,
            [path]: {
              id: newTab.id,
              filename,
              path,
              modified: Date.now(),
            },
          },
        }));
      } catch (error) {
        console.error("Error opening file:", error);
      }
    },

    openTab: async (id) => {
      const tabs = get().tabs;
      const current = get().current;

      // Early returns
      if (current?.id === id) return;

      const tabToOpen = tabs.find((t) => t.id === id);
      if (!tabToOpen) return;

      // Cargar contenido si es local sin contenido
      let updatedTabToOpen = tabToOpen;
      if (tabToOpen.type === TabType.LOCAL && (tabToOpen.content === undefined || tabToOpen.content === null)) {
        try {
          const content = await openFile(tabToOpen.path!);
          updatedTabToOpen = { ...tabToOpen, content };
        } catch (error) {
          console.error("Error loading file:", error);
          return;
        }
      }
      // Actualizar tabs: setear el nuevo current y limpiar el anterior si aplica
      const updatedTabs = tabs.map((tab) => {
        // Actualizar la tab que se está abriendo
        if (tab.id === id) {
          return updatedTabToOpen;
        }

        // Limpiar contenido de la tab anterior (local guardada)
        if (current && tab.id === current.id) {
          const shouldClear = current.type === TabType.LOCAL && !current.isDirty;
          return shouldClear ? { ...tab, content: undefined } : tab;
        }

        return tab;
      });

      set({ tabs: updatedTabs, current: updatedTabToOpen });
    },

    closeTab: async (id, options = {}) => {
      const { tabs, current, actions } = get();
      const tabToClose = tabs.find((t) => t.id === id);

      if (!tabToClose) return true;

      // Manejar cambios sin guardar
      if (tabToClose.isDirty && !options.skipConfirmation) {
        const userChoice = await ask(`"${tabToClose.filename}" has unsaved changes. Do you want to save before closing?`, {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Save",
          cancelLabel: "Don't Save",
        });

        if (userChoice === null) return false; // Cancelado

        if (userChoice === true) {
          // Guardar según el contexto
          if (tabToClose.id === current?.id) {
            await actions.saveCurrentFileOnDisk();
          } else if (tabToClose.type === TabType.LOCAL && tabToClose.path) {
            // Guardar archivo local directamente
            await saveFile(tabToClose.path, tabToClose.content ?? "");
            set((old) => ({
              tabs: old.tabs.map((tab) => (tab.id === id ? { ...tab, isDirty: false } : tab)),
            }));
          } else {
            // Untitled no-current: abrir primero, luego guardar
            await actions.openTab(id);
            await actions.saveCurrentFileOnDisk();
          }
        }
      }

      // Cerrar la tab
      set((old) => {
        const newTabs = old.tabs.filter((tab) => tab.id !== id);

        let newCurrent = old.current;
        if (old.current?.id === id) {
          const closedIndex = old.tabs.findIndex((t) => t.id === id);
          // Priorizar tab anterior, sino siguiente, sino null
          newCurrent = old.tabs[closedIndex - 1] ?? old.tabs[closedIndex + 1] ?? null;
        }

        return { tabs: newTabs, current: newCurrent };
      });

      return true;
    },

    reorderTabs: (newTabs) => {
      set({ tabs: newTabs });
    },
  },
}));

export const useCurrent = () => useEditorStore((state) => state.current);
export const useTabs = () => useEditorStore((state) => state.tabs);
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);
export const useEditorActions = () => useEditorStore((state) => state.actions);
export const useIsInitialized = () => useEditorStore((state) => state.isInitialized);
