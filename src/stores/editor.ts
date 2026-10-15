import { save as tauriSave, open as tauriOpen, message } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { DatabaseV2, FileInfo, LocalFile, OpenedFile, TabMeta, TabType } from "@/lib/types";
import { deserializeTabs, loadEditorState, openFile, saveEditorState, saveFile, serializeTabs } from "@/lib/commands";
import { useShallow } from "zustand/shallow";

const DEFAULT_FILE_INFO: FileInfo = {
  lineEnding: "LF",
  encoding: "UTF-8",
  fileSize: 0,
  extension: "",
};

type State = {
  /** Metadata only; document content never lives in the tab list. */
  tabs: TabMeta[];
  currentTabId: string | null;
  /** Keystrokes update only this slice after the first dirty-flag transition. */
  activeContent: string;
  /** Inactive dirty/untitled documents; clean local files can be read from disk. */
  contentCache: Record<string, string>;
  currentFileInfo: FileInfo | null;
  recentFiles: Record<string, LocalFile>;
  /** True once initialization finishes, including a failed attempt. */
  isInitialized: boolean;
  /** Sticky load failure: dismissing the banner must not unlock session writes. */
  initializationError: string | null;
  editorError: string | null;
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
  dismissError: () => void;
};

function flushActiveToCache(state: State): Record<string, string> {
  const tab = state.tabs.find((t) => t.id === state.currentTabId);
  if (tab && (tab.isDirty || tab.type === TabType.UNTITLED)) {
    return { ...state.contentCache, [tab.id]: state.activeContent };
  }
  return state.contentCache;
}

function buildContentMap(state: State): Record<string, string> {
  const map = { ...state.contentCache };
  if (state.currentTabId) map[state.currentTabId] = state.activeContent;
  return map;
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _, ...rest } = record;
  return rest;
}

function fileInfoForContent(filename: string, content: string): FileInfo {
  const dotIdx = filename.lastIndexOf(".");
  const hasCRLF = content.includes("\r\n");
  const hasLF = content.replace(/\r\n/g, "").includes("\n");
  return {
    encoding: "UTF-8",
    lineEnding: hasCRLF ? (hasLF ? "Mixed" : "CRLF") : hasLF ? "LF" : "N/A",
    fileSize: new Blob([content]).size,
    extension: dotIdx !== -1 ? filename.slice(dotIdx + 1) : "",
  };
}

function tabContent(state: State, tab: TabMeta): string {
  if (state.currentTabId === tab.id) return state.activeContent;
  const cached = state.contentCache[tab.id];
  if (cached !== undefined) return cached;
  if (tab.type === TabType.UNTITLED && !tab.isDirty) return "";
  throw new Error(`Content for "${tab.filename}" is unavailable; the document was not saved.`);
}

export const useEditorStore = create<State & { actions: Actions }>((set, get) => {
  let initialization: Promise<void> | undefined;
  let sessionLoaded = false;
  let navigationRequest = 0;
  let revision = 0;
  let writeQueue: Promise<unknown> = Promise.resolve();
  const editRevisions = new Map<string, number>();
  const fileInfoCache = new Map<string, FileInfo>();
  const reads = new Map<string, Promise<OpenedFile>>();
  const savingPaths = new Map<string, Promise<void>>();
  const pathRevisions = new Map<string, number>();
  const closes = new Map<string, Promise<boolean>>();

  const update = (next: Partial<State>) => {
    revision++;
    set(next);
  };
  const reportError = (context: string, error: unknown): string => {
    const detail = error instanceof Error ? error.message : String(error);
    const text = `${context}: ${detail}`;
    set({ editorError: text });
    return text;
  };
  const enqueueWrite = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = writeQueue.then(operation);
    // A rejected operation must reach its caller, but must not poison later writes.
    writeQueue = result.catch(() => undefined);
    return result;
  };
  const readFile = (path: string): Promise<OpenedFile> => {
    const pending = reads.get(path);
    if (pending) return pending;
    const result = (async () => {
      for (;;) {
        // A read that overlaps an atomic save must observe the replacement, not
        // the old file (or a missing file in an in-flight Save As).
        const pendingSave = savingPaths.get(path);
        if (pendingSave) await pendingSave;
        const before = pathRevisions.get(path) ?? 0;
        const file = await openFile(path);
        const overlappingSave = savingPaths.get(path);
        if (overlappingSave) await overlappingSave;
        if (before !== (pathRevisions.get(path) ?? 0)) continue;
        if (!file) throw new Error(`File not found: ${path}`);
        return file;
      }
    })();
    reads.set(path, result);
    void result.then(
      () => { if (reads.get(path) === result) reads.delete(path); },
      () => { if (reads.get(path) === result) reads.delete(path); },
    );
    return result;
  };
  const prepareTab = async (id: string): Promise<OpenedFile | null> => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return null;
    if (state.currentTabId === id || state.contentCache[id] !== undefined || tab.type === TabType.UNTITLED) {
      const content = tabContent(state, tab);
      return { content, fileInfo: fileInfoCache.get(id) ?? fileInfoForContent(tab.filename, content) };
    }
    if (tab.isDirty) throw new Error(`Unsaved content for "${tab.filename}" is unavailable.`);
    if (!tab.path) throw new Error(`File path for "${tab.filename}" is unavailable.`);
    return readFile(tab.path);
  };
  const activateTab = async (id: string, request: number): Promise<void> => {
    if (request !== navigationRequest || get().currentTabId === id) return;
    const originalTab = get().tabs.find((t) => t.id === id);
    const prepared = await prepareTab(id);
    // Never revive a closed tab or let an older read win a newer selection.
    const state = get();
    const tab = state.tabs.find((t) => t.id === id);
    if (!prepared || !tab || request !== navigationRequest || tab.path !== originalTab?.path) return;
    if (state.currentTabId === id) return;
    const cache = flushActiveToCache(state);
    const content = cache[id] ?? prepared.content;
    const fileInfo = cache[id] !== undefined ? fileInfoCache.get(id) ?? prepared.fileInfo : prepared.fileInfo;
    fileInfoCache.set(id, fileInfo);
    update({
      currentTabId: id,
      activeContent: content,
      contentCache: withoutKey(cache, id),
      currentFileInfo: fileInfo,
    });
  };

  // Save a specific document, not whichever tab happens to be active after a dialog.
  const saveTab = (id: string): Promise<boolean> => enqueueWrite(async () => {
    let reservedPath: string | undefined;
    let finishSave: (() => void) | undefined;
    try {
      await get().actions.initialize();
      let tab = get().tabs.find((t) => t.id === id);
      if (!tab) return false;
      let path = tab.path;
      if (tab.type === TabType.UNTITLED) {
        const selected = await tauriSave({
          defaultPath: tab.filename === "untitled" ? "Untitled" : tab.filename,
          filters: [
            { name: "Text Files", extensions: ["txt"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });
        if (!selected) return false;
        path = selected;
      }
      const state = get();
      tab = state.tabs.find((t) => t.id === id);
      if (!tab) return false;
      if (!path) throw new Error("No file path was selected.");
      if (state.tabs.some((t) => t.id !== id && t.path === path)) {
        throw new Error("That file is already open in another tab. Choose a different path.");
      }
      if (!tab.isDirty && tab.type === TabType.LOCAL && state.currentTabId !== id) return true;
      const content = tabContent(state, tab);
      const savedRevision = editRevisions.get(id) ?? 0;
      reservedPath = path;
      savingPaths.set(path, new Promise<void>((resolve) => { finishSave = resolve; }));
      await saveFile(path, content);
      pathRevisions.set(path, (pathRevisions.get(path) ?? 0) + 1);

      const fresh = get();
      if (!fresh.tabs.some((t) => t.id === id)) return false;
      const filename = path.split(/[\\/]/).pop() || "Untitled";
      const isDirty = (editRevisions.get(id) ?? 0) !== savedRevision;
      const fileInfo = fileInfoForContent(filename, content);
      fileInfoCache.set(id, fileInfo);
      // All slices come from fresh state. Edits made during the write stay dirty/cached.
      update({
        tabs: fresh.tabs.map((t) => t.id === id ? { ...t, type: TabType.LOCAL, filename, path, isDirty } : t),
        contentCache: isDirty ? fresh.contentCache : withoutKey(fresh.contentCache, id),
        currentFileInfo: fresh.currentTabId === id ? fileInfo : fresh.currentFileInfo,
        recentFiles: { ...fresh.recentFiles, [path]: { id, filename, path, modified: Date.now() } },
      });
      return !isDirty;
    } catch (error) {
      reportError("Unable to save file", error);
      return false;
    } finally {
      if (reservedPath) savingPaths.delete(reservedPath);
      finishSave?.();
    }
  });

  const closeTab = async (id: string, options: { skipConfirmation?: boolean }): Promise<boolean> => {
    try {
      await get().actions.initialize();
      let tab = get().tabs.find((t) => t.id === id);
      if (!tab) return true;
      let approvedRevision = editRevisions.get(id) ?? 0;
      if (tab.isDirty && !options.skipConfirmation) {
        // Unlike ask(), a three-way message distinguishes discard from dialog cancellation.
        const choice = await message(`"${tab.filename}" has unsaved changes. Do you want to save before closing?`, {
          title: "Unsaved Changes",
          kind: "warning",
          buttons: { yes: "Save", no: "Don't Save", cancel: "Cancel" },
        });
        if (choice === "Save" || choice === "Yes") {
          if (!await saveTab(id)) return false;
          if (get().tabs.find((t) => t.id === id)?.isDirty) {
            throw new Error("The document changed while saving. Please try again.");
          }
          approvedRevision = editRevisions.get(id) ?? 0;
        } else if (choice !== "Don't Save" && choice !== "No") {
          return false;
        }
      }
      const state = get();
      tab = state.tabs.find((t) => t.id === id);
      if (!tab) return true;
      if ((editRevisions.get(id) ?? 0) !== approvedRevision) {
        throw new Error("The document changed while closing. Please try again.");
      }
      const request = navigationRequest;
      const index = state.tabs.findIndex((t) => t.id === id);
      const remaining = state.tabs.filter((t) => t.id !== id);
      const nextTab = state.currentTabId === id ? remaining[index - 1] ?? remaining[index] : undefined;
      const prepared = nextTab ? await prepareTab(nextTab.id) : null;

      const fresh = get();
      if (!fresh.tabs.some((t) => t.id === id)) return true;
      if ((editRevisions.get(id) ?? 0) !== approvedRevision) {
        throw new Error("The document changed while closing. Please try again.");
      }
      let next: Partial<State> = {
        tabs: fresh.tabs.filter((t) => t.id !== id),
        contentCache: withoutKey(fresh.contentCache, id),
      };
      if (fresh.currentTabId === id) {
        if (request !== navigationRequest) return false;
        const target = fresh.tabs.find((t) => t.id === nextTab?.id);
        if (nextTab && (!target || target.path !== nextTab.path || !prepared)) return false;
        const content = target ? fresh.contentCache[target.id] ?? prepared!.content : "";
        const fileInfo = target
          ? fresh.contentCache[target.id] !== undefined ? fileInfoCache.get(target.id) ?? prepared!.fileInfo : prepared!.fileInfo
          : null;
        if (target && fileInfo) fileInfoCache.set(target.id, fileInfo);
        navigationRequest++;
        next = {
          ...next,
          currentTabId: target?.id ?? null,
          activeContent: content,
          currentFileInfo: fileInfo,
          contentCache: withoutKey(next.contentCache!, target?.id ?? ""),
        };
      }
      update(next);
      editRevisions.delete(id);
      fileInfoCache.delete(id);
      return true;
    } catch (error) {
      reportError("Unable to close tab", error);
      return false;
    }
  };

  return {
    tabs: [],
    currentTabId: null,
    activeContent: "",
    contentCache: {},
    currentFileInfo: null,
    recentFiles: {},
    isInitialized: false,
    initializationError: null,
    editorError: null,
    actions: {
      initialize: () => {
        if (initialization) return initialization;
        initialization = (async () => {
          try {
            const db = await loadEditorState();
            if (db.schemaVersion !== "V2" || !db.recentFiles || !db.session) {
              throw new Error("Invalid editor session.");
            }
            const { tabs, contentCache } = deserializeTabs(db.session.tabs);
            update({ tabs, contentCache, recentFiles: db.recentFiles });
            sessionLoaded = true;
            const id = tabs.find((t) => t.id === db.session.currentTabId)?.id;
            if (id) {
              try {
                const prepared = await prepareTab(id);
                if (prepared) {
                  fileInfoCache.set(id, prepared.fileInfo);
                  update({
                    currentTabId: id,
                    activeContent: prepared.content,
                    currentFileInfo: prepared.fileInfo,
                    contentCache: withoutKey(contentCache, id),
                  });
                }
              } catch (error) {
                // Keep the tab metadata, but don't expose an empty editable replacement.
                reportError("Unable to restore active file", error);
              }
            }
          } catch (error) {
            const text = reportError("Unable to load editor session", error);
            set({ initializationError: text });
          } finally {
            set({ isInitialized: true });
          }
        })();
        return initialization;
      },
      persistSession: () => enqueueWrite(async () => {
        try {
          await get().actions.initialize();
          if (!sessionLoaded) {
            throw new Error(get().initializationError ?? "The existing session could not be loaded. Session saving is disabled.");
          }
          // Snapshot at execution time, not queue time. If edits arrive during IPC,
          // persist them too before allowing a caller (notably window close) to proceed.
          let savedRevision: number;
          do {
            const state = get();
            savedRevision = revision;
            const db: DatabaseV2 = {
              recentFiles: state.recentFiles,
              session: {
                tabs: serializeTabs(state.tabs, buildContentMap(state)),
                currentTabId: state.currentTabId ?? undefined,
              },
              schemaVersion: "V2",
            };
            await saveEditorState(db);
          } while (savedRevision !== revision);
        } catch (error) {
          reportError("Unable to persist editor session", error);
          throw error;
        }
      }),
      addBlank: () => {
        if (!get().isInitialized) {
          void get().actions.initialize().then(() => get().actions.addBlank());
          return;
        }
        navigationRequest++;
        const state = get();
        const id = crypto.randomUUID();
        const blank: TabMeta = { id, type: TabType.UNTITLED, isDirty: false, filename: "untitled" };
        fileInfoCache.set(id, { ...DEFAULT_FILE_INFO });
        update({
          tabs: [...state.tabs, blank],
          currentTabId: id,
          activeContent: "",
          contentCache: flushActiveToCache(state),
          currentFileInfo: { ...DEFAULT_FILE_INFO },
        });
      },
      setContent: (content: string) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === state.currentTabId);
        if (!tab || state.activeContent === content) return;
        editRevisions.set(tab.id, (editRevisions.get(tab.id) ?? 0) + 1);
        update(tab.isDirty ? { activeContent: content } : {
          activeContent: content,
          tabs: state.tabs.map((t) => t.id === tab.id ? { ...t, isDirty: true } : t),
        });
      },
      saveCurrentFileOnDisk: async () => {
        const requestedId = get().currentTabId;
        if (requestedId) {
          await saveTab(requestedId);
        } else {
          await get().actions.initialize();
          const id = get().currentTabId;
          if (id) await saveTab(id);
        }
      },
      openLocalFile: async () => {
        try {
          const path = await tauriOpen({
            title: "Open File",
            filters: [{ name: "Text based files", extensions: ["txt", "md", "json", "html", "css", "js", "ts", "csv", "py", "rs"] }],
          });
          if (path) await get().actions.openByPath(path);
        } catch (error) {
          reportError("Unable to open file", error);
        }
      },
      openByPath: async (path: string) => {
        const request = ++navigationRequest;
        try {
          await get().actions.initialize();
          const pendingSave = savingPaths.get(path);
          if (pendingSave) await pendingSave;
          const existing = get().tabs.find((t) => t.path === path);
          if (existing) {
            await activateTab(existing.id, request);
            return;
          }
          const result = await readFile(path);
          const state = get();
          // Concurrent opens share a read and cannot create duplicate tabs.
          const duplicate = state.tabs.find((t) => t.path === path);
          if (duplicate) {
            await activateTab(duplicate.id, request);
            return;
          }
          const id = crypto.randomUUID();
          const filename = path.split(/[\\/]/).pop() || path;
          const tab: TabMeta = { id, filename, path, isDirty: false, type: TabType.LOCAL };
          fileInfoCache.set(id, result.fileInfo);
          const next: Partial<State> = {
            tabs: [...state.tabs, tab],
            recentFiles: { ...state.recentFiles, [path]: { id, filename, path, modified: Date.now() } },
          };
          if (request === navigationRequest) {
            Object.assign(next, {
              currentTabId: id,
              activeContent: result.content,
              currentFileInfo: result.fileInfo,
              contentCache: flushActiveToCache(state),
            });
          }
          update(next);
        } catch (error) {
          reportError(`Unable to open "${path}"`, error);
        }
      },
      openTab: async (id: string) => {
        const request = ++navigationRequest;
        try {
          await get().actions.initialize();
          await activateTab(id, request);
        } catch (error) {
          reportError("Unable to switch tabs", error);
        }
      },
      closeTab: (id, options = {}) => {
        const pending = closes.get(id);
        if (pending) return pending;
        const result = closeTab(id, options);
        closes.set(id, result);
        void result.then(() => { if (closes.get(id) === result) closes.delete(id); });
        return result;
      },
      closeCurrentTab: async () => {
        const id = get().currentTabId;
        return id ? get().actions.closeTab(id) : true;
      },
      resetCurrent: () => {
        if (!get().isInitialized) {
          void get().actions.initialize().then(() => get().actions.resetCurrent());
          return;
        }
        navigationRequest++;
        const state = get();
        update({ currentTabId: null, activeContent: "", contentCache: flushActiveToCache(state), currentFileInfo: null });
      },
      dismissError: () => set({ editorError: null }),
    },
  };
});

/** Only the editor subscribes to the frequently updated document content. */
export const useActiveContent = () => useEditorStore((state) => state.activeContent);

export const useCurrentTabMeta = () =>
  useEditorStore(
    useShallow((state) => {
      if (!state.currentTabId) return null;
      return state.tabs.find((t) => t.id === state.currentTabId) ?? null;
    }),
  );

export const useCurrentFileInfo = () => useEditorStore(useShallow((state) => state.currentFileInfo));
export const useTabsMeta = () => useEditorStore(useShallow((state) => state.tabs));
export const useHasTabs = () => useEditorStore((state) => state.tabs.length > 0);
export const useIsActiveTab = (tabId: string) => useEditorStore((state) => state.currentTabId === tabId);
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);
export const useEditorActions = () => useEditorStore((state) => state.actions);
export const useIsInitialized = () => useEditorStore((state) => state.isInitialized);
export const useInitializationError = () => useEditorStore((state) => state.initializationError);
export const useEditorError = () => useEditorStore((state) => state.editorError);
