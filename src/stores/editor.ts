import { save as tauriSave, open as tauriOpen, ask } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { DatabaseV2, FileInfo, LocalFile, SessionTab, TabMeta, TabType } from "@/lib/types";
import { deserializeTabs, loadEditorState, openFile, saveEditorState, saveFile, serializeTabs } from "@/lib/commands";
import { useShallow } from "zustand/shallow";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

/** Default file info for untitled / in-memory documents. */
const DEFAULT_FILE_INFO: FileInfo = {
  lineEnding: "LF",
  encoding: "UTF-8",
  fileSize: 0,
  extension: "",
};

type State = {
  /** Tab metadata only — content is NEVER stored here. */
  tabs: TabMeta[];

  /** ID of the currently active tab (null when no tab is open). */
  currentTabId: string | null;

  /**
   * Content of the currently active tab.
   * This is the ONLY piece of state that `setContent` touches,
   * making every keystroke an O(1) state update instead of cloning
   * the entire `tabs` array.
   */
  activeContent: string;

  /**
   * Content cache for inactive tabs whose data must be preserved:
   *  - dirty tabs (unsaved edits)
   *  - untitled tabs (no backing file)
   *
   * Clean local-file tabs are NOT cached — they can be re-read from disk.
   */
  contentCache: Record<string, string>;

  /**
   * File metadata (encoding, line ending, size, extension) for the
   * currently active tab. Populated when a file is opened from disk,
   * set to sensible defaults for untitled tabs, and cleared when no
   * tab is active.
   */
  currentFileInfo: FileInfo | null;

  recentFiles: Record<string, LocalFile>;
  isInitialized: boolean;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers (pure functions, no side-effects)
// ---------------------------------------------------------------------------

/**
 * Flush the active tab's content into the content cache so it isn't lost
 * when we switch away from it.
 *
 * Returns a **new** cache object (never mutates the original).
 * Only caches when the tab actually needs it (dirty or untitled).
 */
function flushActiveToCache(state: Pick<State, "currentTabId" | "activeContent" | "contentCache" | "tabs">): Record<string, string> {
  const { currentTabId, activeContent, contentCache, tabs } = state;
  if (!currentTabId) return contentCache;

  const currentTab = tabs.find((t) => t.id === currentTabId);
  if (!currentTab) return contentCache;

  if (currentTab.isDirty || currentTab.type === TabType.UNTITLED) {
    return { ...contentCache, [currentTabId]: activeContent };
  }

  // Clean local file — no need to cache, can be re-read from disk.
  return contentCache;
}

/**
 * Build a complete id→content map that covers EVERY tab whose content we
 * currently hold in memory (active + cached). Used for persistence.
 */
function buildContentMap(state: Pick<State, "currentTabId" | "activeContent" | "contentCache">): Record<string, string> {
  const map: Record<string, string> = { ...state.contentCache };
  if (state.currentTabId) {
    map[state.currentTabId] = state.activeContent;
  }
  return map;
}

/**
 * Remove an entry from a record, returning a shallow copy without the key.
 */
function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _, ...rest } = record;
  return rest;
}

/**
 * Derive a FileInfo for an untitled tab based on its filename (for the
 * extension) while keeping sensible defaults for everything else.
 */
function fileInfoForUntitled(filename: string): FileInfo {
  const dotIdx = filename.lastIndexOf(".");
  const extension = dotIdx !== -1 ? filename.slice(dotIdx + 1) : "";
  return { ...DEFAULT_FILE_INFO, extension };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useEditorStore = create<State & { actions: Actions }>((set, get) => ({
  tabs: [],
  currentTabId: null,
  activeContent: "",
  contentCache: {},
  currentFileInfo: null,
  recentFiles: {},
  isInitialized: false,

  actions: {
    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    initialize: async () => {
      try {
        const db = await loadEditorState();

        const { tabs: loadedTabs, contentCache: initialCache } =
          db.session.tabs.length > 0 ? deserializeTabs(db.session.tabs) : { tabs: [], contentCache: {} };

        const currentTabId = (loadedTabs.find((t) => t.id === db.session.currentTabId) ? db.session.currentTabId : null) ?? null;

        // Load the active tab's content (from cache or from disk).
        let activeContent = "";
        let currentFileInfo: FileInfo | null = null;
        const contentCache = { ...initialCache };

        if (currentTabId) {
          const currentTab = loadedTabs.find((t) => t.id === currentTabId);

          if (contentCache[currentTabId] !== undefined) {
            activeContent = contentCache[currentTabId];
            delete contentCache[currentTabId]; // promote to activeContent

            // For cached content we derive basic metadata.
            currentFileInfo = currentTab ? fileInfoForUntitled(currentTab.filename) : { ...DEFAULT_FILE_INFO };
          } else if (currentTab?.type === TabType.LOCAL && currentTab.path) {
            try {
              const result = await openFile(currentTab.path);
              if (result) {
                activeContent = result.content;
                currentFileInfo = result.fileInfo;
              }
            } catch (error) {
              console.error("Failed to load current tab content:", error);
            }
          } else if (currentTab) {
            // Untitled tab with no cached content.
            currentFileInfo = fileInfoForUntitled(currentTab.filename);
          }
        }

        set({
          tabs: loadedTabs,
          currentTabId,
          activeContent,
          contentCache,
          currentFileInfo,
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
      const state = get();
      const { tabs, recentFiles, currentTabId } = state;

      const contentMap = buildContentMap(state);
      const sessionTabs: SessionTab[] = serializeTabs(tabs, contentMap);

      const db: DatabaseV2 = {
        recentFiles,
        session: {
          tabs: sessionTabs,
          currentTabId: currentTabId ?? undefined,
        },
        schemaVersion: "V2",
      };

      try {
        await saveEditorState(db);
      } catch (error) {
        console.error("Failed to persist session:", error);
      }
    },

    // -----------------------------------------------------------------------
    // Tab creation
    // -----------------------------------------------------------------------

    addBlank: () => {
      const id = crypto.randomUUID();
      const blank: TabMeta = {
        id,
        type: TabType.UNTITLED,
        isDirty: false,
        filename: "untitled",
        path: undefined,
      };

      const state = get();
      const flushedCache = flushActiveToCache(state);

      set({
        tabs: [...state.tabs, blank],
        currentTabId: id,
        activeContent: "",
        contentCache: flushedCache,
        currentFileInfo: { ...DEFAULT_FILE_INFO },
      });
    },

    // -----------------------------------------------------------------------
    // Content editing — the hot path
    // -----------------------------------------------------------------------

    /**
     * O(1) content update.
     *
     * - On the very first edit (isDirty=false → true) we do a single
     *   `tabs.map()` to flip the dirty flag. After that every subsequent
     *   keystroke only touches `activeContent` — the `tabs` array reference
     *   stays the same, so the tab bar never re-renders from typing.
     */
    setContent: (content: string) => {
      const { currentTabId, tabs } = get();
      if (!currentTabId) return;

      const tab = tabs.find((t) => t.id === currentTabId);
      if (!tab) return;

      if (tab.isDirty) {
        // Hot path: only update the isolated content string.
        set({ activeContent: content });
      } else {
        // First edit: flip isDirty (one-time O(n) on the tabs array).
        set({
          activeContent: content,
          tabs: tabs.map((t) => (t.id === currentTabId ? { ...t, isDirty: true } : t)),
        });
      }
    },

    // -----------------------------------------------------------------------
    // File saving
    // -----------------------------------------------------------------------

    saveCurrentFileOnDisk: async () => {
      const { currentTabId, tabs, activeContent, recentFiles, contentCache } = get();
      if (!currentTabId) return;

      const currentTab = tabs.find((t) => t.id === currentTabId);
      if (!currentTab) return;

      try {
        let pathToSave = currentTab.path;

        if (currentTab.type === TabType.UNTITLED) {
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
        await saveFile(pathToSave, activeContent);

        const filename = pathToSave.split(/[\\/]/).pop() || "Untitled";
        const dotIdx = filename.lastIndexOf(".");
        const extension = dotIdx !== -1 ? filename.slice(dotIdx + 1) : "";

        // Recompute file info after save to reflect the new on-disk state.
        const prevInfo = get().currentFileInfo;
        const updatedFileInfo: FileInfo = {
          lineEnding: prevInfo?.lineEnding ?? "LF",
          encoding: "UTF-8",
          fileSize: new Blob([activeContent]).size,
          extension,
        };

        set({
          tabs: tabs.map((t) => (t.id === currentTabId ? { ...t, type: TabType.LOCAL, filename, path: pathToSave, isDirty: false } : t)),
          // Content is now on disk and clean — remove from cache if present.
          contentCache: withoutKey(contentCache, currentTabId),
          currentFileInfo: updatedFileInfo,
          recentFiles: {
            ...recentFiles,
            [pathToSave]: {
              id: currentTabId,
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

    // -----------------------------------------------------------------------
    // File opening
    // -----------------------------------------------------------------------

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
      const state = get();
      const { tabs, recentFiles } = state;
      const existingTab = tabs.find((t) => t.path === path);

      if (existingTab) {
        // Tab already open — switch to it.
        const flushedCache = flushActiveToCache(state);

        let content: string;
        let fileInfo: FileInfo;

        if (flushedCache[existingTab.id] !== undefined) {
          content = flushedCache[existingTab.id];
          // Content came from cache — derive basic metadata.
          fileInfo = fileInfoForUntitled(existingTab.filename);
        } else {
          const result = await openFile(path);
          content = result?.content ?? "";
          fileInfo = result?.fileInfo ?? fileInfoForUntitled(existingTab.filename);
        }

        set({
          currentTabId: existingTab.id,
          activeContent: content,
          contentCache: withoutKey(flushedCache, existingTab.id),
          currentFileInfo: fileInfo,
        });
        return;
      }

      try {
        const result = await openFile(path);
        const content = result?.content ?? "";
        const fileInfo = result?.fileInfo ?? { ...DEFAULT_FILE_INFO };

        const filename = path.split(/[\\/]/).pop() || path;
        const newId = crypto.randomUUID();

        const newTab: TabMeta = {
          id: newId,
          filename,
          path,
          isDirty: false,
          type: TabType.LOCAL,
        };

        const flushedCache = flushActiveToCache(state);

        set({
          tabs: [...tabs, newTab],
          currentTabId: newId,
          activeContent: content,
          contentCache: flushedCache,
          currentFileInfo: fileInfo,
          recentFiles: {
            ...recentFiles,
            [path]: {
              id: newId,
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

    // -----------------------------------------------------------------------
    // Tab switching
    // -----------------------------------------------------------------------

    openTab: async (id: string) => {
      const state = get();
      const { tabs, currentTabId } = state;
      if (currentTabId === id) return;

      const tabToOpen = tabs.find((t) => t.id === id);
      if (!tabToOpen) return;

      // 1. Flush current active content into the cache.
      const flushedCache = flushActiveToCache(state);

      // 2. Load the target tab's content: from cache → from disk → empty.
      let newContent: string;
      let newFileInfo: FileInfo;

      if (flushedCache[id] !== undefined) {
        newContent = flushedCache[id];
        // Content came from in-memory cache — derive basic metadata.
        newFileInfo = fileInfoForUntitled(tabToOpen.filename);
      } else if (tabToOpen.type === TabType.LOCAL && tabToOpen.path) {
        try {
          const result = await openFile(tabToOpen.path);
          newContent = result?.content ?? "";
          newFileInfo = result?.fileInfo ?? fileInfoForUntitled(tabToOpen.filename);
        } catch (error) {
          console.error("Error loading file:", error);
          return;
        }
      } else {
        newContent = "";
        newFileInfo = fileInfoForUntitled(tabToOpen.filename);
      }

      set({
        currentTabId: id,
        activeContent: newContent,
        // Remove the target from cache since it's now active.
        contentCache: withoutKey(flushedCache, id),
        currentFileInfo: newFileInfo,
      });
    },

    // -----------------------------------------------------------------------
    // Tab closing
    // -----------------------------------------------------------------------

    closeTab: async (id: string, options = {}) => {
      const state = get();
      const { tabs, currentTabId, activeContent, contentCache, actions } = state;
      const tabToClose = tabs.find((t) => t.id === id);

      if (!tabToClose) return true;

      // --- Handle dirty-tab confirmation ---
      if (tabToClose.isDirty && !options.skipConfirmation) {
        const userChoice = await ask(`"${tabToClose.filename}" has unsaved changes. Do you want to save before closing?`, {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Save",
          cancelLabel: "Don't Save",
        });

        if (userChoice === null) return false;

        if (userChoice === true) {
          // Resolve the content for this specific tab.
          const tabContent = id === currentTabId ? activeContent : (contentCache[id] ?? "");

          if (tabToClose.type === TabType.LOCAL && tabToClose.path) {
            await saveFile(tabToClose.path, tabContent);
          } else {
            // Untitled tab needs the Save-As flow — must be current for that.
            if (id !== currentTabId) {
              await actions.openTab(id);
            }
            await actions.saveCurrentFileOnDisk();
          }
        }
      }

      // --- Re-read state after potential async operations ---
      const freshState = get();
      const freshTabs = freshState.tabs;
      const freshCurrentTabId = freshState.currentTabId;

      const closedIndex = freshTabs.findIndex((t) => t.id === id);
      const newTabs = freshTabs.filter((t) => t.id !== id);
      const newCache = withoutKey(freshState.contentCache, id);

      let newCurrentTabId = freshCurrentTabId;
      let newActiveContent = freshState.activeContent;
      let newFileInfo: FileInfo | null = freshState.currentFileInfo;

      if (freshCurrentTabId === id) {
        // Pick adjacent tab (prefer left, then right, then none).
        const nextTab = newTabs[closedIndex - 1] ?? newTabs[closedIndex] ?? null;
        newCurrentTabId = nextTab?.id ?? null;

        if (newCurrentTabId && nextTab) {
          // Load the new current tab's content.
          if (newCache[newCurrentTabId] !== undefined) {
            newActiveContent = newCache[newCurrentTabId];
            newFileInfo = fileInfoForUntitled(nextTab.filename);
          } else if (nextTab.type === TabType.LOCAL && nextTab.path) {
            try {
              const result = await openFile(nextTab.path);
              newActiveContent = result?.content ?? "";
              newFileInfo = result?.fileInfo ?? fileInfoForUntitled(nextTab.filename);
            } catch {
              newActiveContent = "";
              newFileInfo = fileInfoForUntitled(nextTab.filename);
            }
          } else {
            newActiveContent = "";
            newFileInfo = fileInfoForUntitled(nextTab.filename);
          }
        } else {
          newActiveContent = "";
          newFileInfo = null;
        }
      }

      set({
        tabs: newTabs,
        currentTabId: newCurrentTabId,
        activeContent: newActiveContent,
        contentCache: withoutKey(newCache, newCurrentTabId ?? ""),
        currentFileInfo: newFileInfo,
      });
      return true;
    },

    closeCurrentTab: async () => {
      const { currentTabId, actions } = get();
      if (!currentTabId) return true;
      return actions.closeTab(currentTabId);
    },

    // -----------------------------------------------------------------------
    // Misc
    // -----------------------------------------------------------------------

    resetCurrent: () => {
      const state = get();
      const flushedCache = flushActiveToCache(state);
      set({
        currentTabId: null,
        activeContent: "",
        contentCache: flushedCache,
        currentFileInfo: null,
      });
    },
  },
}));

// ---------------------------------------------------------------------------
// Hooks — each selector is as narrow as possible so that only the
// components that truly depend on a given piece of state re-render.
// ---------------------------------------------------------------------------

/**
 * Active document content — only the editor textarea subscribes to this.
 * Updating `activeContent` will NOT cause the tab bar, footer, or any
 * other component to re-render.
 */
export const useActiveContent = () => useEditorStore((state) => state.activeContent);

/**
 * Metadata of the currently active tab (everything except content).
 * Used by the footer (isDirty indicator) and the editor page (to decide
 * whether to render the editor at all).
 *
 * Returns `null` when no tab is open.
 */
export const useCurrentTabMeta = () =>
  useEditorStore(
    useShallow((state) => {
      if (!state.currentTabId) return null;
      return state.tabs.find((t) => t.id === state.currentTabId) ?? null;
    }),
  );

/**
 * File metadata (encoding, line ending, size, extension) for the currently
 * active tab.  Used by the footer's status cells.
 *
 * Returns `null` when no tab is open.
 */
export const useCurrentFileInfo = () => useEditorStore(useShallow((state) => state.currentFileInfo));

/**
 * Tab metadata list for the tab bar. Since `setContent` never modifies
 * `tabs` (except the one-time isDirty flip), the tab bar is inert while
 * the user types.
 */
export const useTabsMeta = () => useEditorStore(useShallow((state) => state.tabs));

/** True when at least one tab is open. */
export const useHasTabs = () => useEditorStore((state) => state.tabs.length > 0);

/** True when the given tab is the active one. */
export const useIsActiveTab = (tabId: string) => useEditorStore((state) => state.currentTabId === tabId);

/** Recent files map. */
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);

/** Stable actions reference (never changes between renders). */
export const useEditorActions = () => useEditorStore((state) => state.actions);

/** Initialisation flag. */
export const useIsInitialized = () => useEditorStore((state) => state.isInitialized);
