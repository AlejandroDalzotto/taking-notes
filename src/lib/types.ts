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

/**
 * Metadata about a file detected at read time on the Rust side.
 * Returned alongside the file content by the `open_file` command.
 */
export interface FileInfo {
  /** Detected line-ending style: "CRLF", "LF", "Mixed", or "N/A". */
  lineEnding: string;
  /** Encoding used to read the file (always "UTF-8" for now). */
  encoding: string;
  /** On-disk file size in bytes at the moment it was read. */
  fileSize: number;
  /** File extension without the leading dot, e.g. "txt", "md". Empty string when none. */
  extension: string;
}

/**
 * Bundle returned by the `open_file` Tauri command so the frontend gets
 * content + metadata in a single IPC round-trip.
 */
export interface OpenedFile {
  content: string;
  fileInfo: FileInfo;
}

export enum TabType {
  LOCAL = "local",
  UNTITLED = "untitled",
}
