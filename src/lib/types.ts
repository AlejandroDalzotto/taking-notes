import { JSX } from "react";

export enum SchemaVersion {
  V1 = "V1",
  V2 = "V2",
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: JSX.Element;
}

export interface SessionTab {
  id: string;
  path?: string; // undefined for untitled
  filename: string;
  isDirty: boolean;
  content?: string; // Only for untitled tabs
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

// Frontend Tab type (extends session with runtime properties)
export interface Tab {
  id: string;
  type: TabType;
  filename: string;
  path?: string;
  content?: string;
  isDirty: boolean;
}

export enum TabType {
  LOCAL = "local",
  UNTITLED = "untitled",
}
