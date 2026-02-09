export enum SchemaVersion {
  V1 = "V1",
  V2 = "V2",
}

export interface SessionTab {
  id: string;
  path?: string; // undefined for untitled
  filename: string;
  isDirty: boolean;
  content?: string; // Only for dirty/untitled tabs
}

export interface EditorSession {
  tabs: SessionTab[];
  currentTabId?: string;
}

export interface LocalFile {
  id: string;
  filename: string;
  modified: number; // Unix timestamp in ms
  path: string;
}

export interface DatabaseV2 {
  recentFiles: Record<string, LocalFile>; // path -> LocalFile
  session: EditorSession;
  schemaVersion: "V2";
}

/**
 * Tab metadata without content — used in the store's `tabs[]` array and
 * anywhere the UI only needs to render tab chrome (header, footer, etc.).
 *
 * Separating metadata from content is the key performance optimisation:
 * `setContent` no longer clones the entire tabs array on every keystroke.
 */
export interface TabMeta {
  id: string;
  type: TabType;
  filename: string;
  path?: string;
  isDirty: boolean;
}

/**
 * Full tab representation including content.
 * Only used during serialisation / deserialisation of the session and
 * for transient operations that need both metadata + content at once.
 */
export interface Tab extends TabMeta {
  content?: string;
}

export enum TabType {
  LOCAL = "local",
  UNTITLED = "untitled",
}
