import { invoke } from "@tauri-apps/api/core";
import { DatabaseV2, OpenedFile, SessionTab, TabMeta, TabType } from "@/lib/types";

export async function saveFile(path: string, content: string) {
  const message = await invoke("save_file", { entry: { path, content } });
  return message;
}

export async function openFile(path: string): Promise<OpenedFile | null> {
  const result = await invoke<OpenedFile | null>("open_file", { path });
  return result;
}

export async function loadEditorState(): Promise<DatabaseV2> {
  return await invoke("load_editor_state");
}

export async function saveEditorState(state: DatabaseV2): Promise<void> {
  return await invoke("save_editor_state", { state });
}

/**
 * Convert frontend TabMeta[] + a content map into SessionTab[] for persistence.
 *
 * Content is only stored for tabs that need it:
 *  - dirty tabs (unsaved changes that can't be recovered from disk)
 *  - untitled tabs (no backing file at all)
 */
export function serializeTabs(tabs: TabMeta[], contentMap: Record<string, string>): SessionTab[] {
  return tabs.map((tab) => ({
    id: tab.id,
    path: tab.type === TabType.LOCAL ? tab.path : undefined,
    filename: tab.filename,
    isDirty: tab.isDirty,
    content: tab.isDirty || tab.type === TabType.UNTITLED ? (contentMap[tab.id] ?? "") : undefined,
  }));
}

/**
 * Restore session tabs into the runtime representation.
 *
 * Returns:
 *  - `tabs`         – metadata-only array (no content) for the store's `tabs` slice
 *  - `contentCache` – id → content for every tab that carried persisted content
 */
export function deserializeTabs(sessionTabs: SessionTab[]): {
  tabs: TabMeta[];
  contentCache: Record<string, string>;
} {
  const tabs: TabMeta[] = [];
  const contentCache: Record<string, string> = {};

  for (const st of sessionTabs) {
    tabs.push({
      id: st.id,
      type: st.path ? TabType.LOCAL : TabType.UNTITLED,
      filename: st.filename,
      path: st.path,
      isDirty: st.isDirty,
    });

    if (st.content !== undefined) {
      contentCache[st.id] = st.content;
    }
  }

  return { tabs, contentCache };
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

/**
 * Drain and return file paths that were passed via CLI arguments on cold start
 * (e.g. the user right-clicked a file and chose "Open with Taking Notes").
 *
 * This is a one-shot command — subsequent calls return an empty array.
 */
export async function takeCliFilePaths(): Promise<string[]> {
  return await invoke<string[]>("take_cli_file_paths");
}
