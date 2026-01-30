import { openFile, saveFile } from "@/lib/commands";
import { Tab, DatabaseV2, LocalFile, SessionTab, TabType } from "@/lib/types";
import { save as tauriSave, open as tauriOpen, ask } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { loadEditorState, saveEditorState, serializeTabs, deserializeTabs } from "@/lib/commands";
import { immer } from "zustand/middleware/immer";

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

const useEditorStore = create<State>()(
  immer((set, get) => ({
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

          set((state) => {
            state.tabs.push(...loadedTabs);
            state.current = currentTab;
            state.recentFiles = db.recentFiles;
            state.isInitialized = true;
          });
        } catch (error) {
          console.error("Failed to initialize editor:", error);
          set((state) => {
            state.isInitialized = true;
          });
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
        set((state) => {
          state.current = blank;
          state.tabs.push(blank);
        });
      },

      setContent: (content: string) =>
        set((state) => {
          if (!state.current) return;

          state.current.content = content;
          state.current.isDirty = true;

          const tab = state.tabs.find((t) => t.id === state.current!.id);
          if (tab) {
            tab.content = content;
            tab.isDirty = true;
          }
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

          set((state) => {
            const tab = state.tabs.find((t) => t.id === current.id);
            if (tab) {
              tab.type = TabType.LOCAL;
              tab.filename = filename;
              tab.path = pathToSave;
              tab.isDirty = false;
            }

            if (state.current && state.current.id === current.id) {
              state.current.type = TabType.LOCAL;
              state.current.filename = filename;
              state.current.path = pathToSave;
              state.current.isDirty = false;
            }

            state.recentFiles[pathToSave!] = {
              id: current.id,
              filename,
              path: pathToSave!,
              modified: Date.now(),
            };
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
        const tabs = get().tabs;

        let existingTab = tabs.find((t) => t.path === path);
        if (existingTab) {
          if (existingTab.type === TabType.LOCAL) {
            existingTab.content = await openFile(path);
          }

          set((state) => {
            state.current = existingTab!;
          });
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

          set((state) => {
            state.tabs.push(newTab);
            state.current = newTab;
            state.recentFiles[path] = {
              id: newTab.id,
              filename,
              path,
              modified: Date.now(),
            };
          });
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

        set((state) => {
          // Actualizar la tab que se está abriendo
          const targetTab = state.tabs.find((t) => t.id === id);
          if (targetTab && updatedTabToOpen.content !== undefined) {
            targetTab.content = updatedTabToOpen.content;
          }

          // Limpiar contenido de la tab anterior (local guardada)
          if (current) {
            const previousTab = state.tabs.find((t) => t.id === current.id);
            if (previousTab && current.type === TabType.LOCAL && !current.isDirty) {
              previousTab.content = undefined;
            }
          }

          state.current = targetTab || updatedTabToOpen;
        });
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
              set((state) => {
                const tab = state.tabs.find((t) => t.id === id);
                if (tab) {
                  tab.isDirty = false;
                }
              });
            } else {
              // Untitled no-current: abrir primero, luego guardar
              await actions.openTab(id);
              await actions.saveCurrentFileOnDisk();
            }
          }
        }

        // Cerrar la tab
        set((state) => {
          const closedIndex = state.tabs.findIndex((t) => t.id === id);
          state.tabs = state.tabs.filter((tab) => tab.id !== id);

          if (state.current?.id === id) {
            // Priorizar tab anterior, sino siguiente, sino null
            const newCurrent = tabs[closedIndex - 1] ?? tabs[closedIndex + 1] ?? null;
            state.current = newCurrent;
          }
        });

        return true;
      },

      reorderTabs: (newTabs) => {
        set((state) => {
          state.tabs = newTabs;
        });
      },
    },
  })),
);

export const useCurrent = () => useEditorStore((state) => state.current);
export const useTabs = () => useEditorStore((state) => state.tabs);
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);
export const useEditorActions = () => useEditorStore((state) => state.actions);
export const useIsInitialized = () => useEditorStore((state) => state.isInitialized);
