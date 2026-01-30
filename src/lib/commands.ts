import { invoke } from "@tauri-apps/api/core";
import { DatabaseV2, SchemaVersion, SessionTab, Tab, TabType } from "@/lib/types";

export async function saveFile(path: string, content: string) {
  const message = await invoke("save_file", { entry: { path, content } });
  return message;
}

export async function openFile(path: string) {
  const content = await invoke<string>("open_file", { path });

  if (!content) {
    return "";
  }

  return content;
}

export async function loadEditorState(): Promise<DatabaseV2> {
  return await invoke("load_editor_state");
}

export async function saveEditorState(state: DatabaseV2): Promise<void> {
  return await invoke("save_editor_state", { state });
}

// Helper to convert frontend Tab[] to SessionTab[]
export function serializeTabs(tabs: Tab[]): SessionTab[] {
  return tabs.map((tab) => ({
    ...tab,
    path: tab.type === TabType.LOCAL ? tab.path : undefined,
    content: tab.isDirty ? tab.content : undefined,
  }));
}

// Helper to convert SessionTab[] to frontend Tab[]
export function deserializeTabs(sessionTabs: SessionTab[]): Tab[] {
  return sessionTabs.map((st) => ({
    ...st,
    type: st.path ? TabType.LOCAL : TabType.UNTITLED,
  }));
}

/**
 * Migration / Manager helpers
 */

export async function checkForMigrationToV2(): Promise<boolean> {
  const needs = await invoke<boolean>("check_for_migration_to_v2");
  return needs;
}

export async function migrateV1ToV2(): Promise<boolean> {
  const result = await invoke<boolean>("migrate_v1_to_v2");
  return result;
}
