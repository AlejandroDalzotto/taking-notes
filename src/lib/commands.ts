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
  return tabs.map((tab) => {
    const needsContent = tab.isDirty || tab.type === TabType.UNTITLED;
    const content = contentMap[tab.id];
    if (needsContent && content === undefined) {
      throw new Error(`Unsaved content for "${tab.filename}" is unavailable; session saving was canceled.`);
    }
    return {
      id: tab.id,
      path: tab.type === TabType.LOCAL ? tab.path : undefined,
      filename: tab.filename,
      isDirty: tab.isDirty,
      content: needsContent ? content : undefined,
    };
  });
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

  const ids = new Set<string>();
  for (const st of sessionTabs) {
    if (!st.id || ids.has(st.id) || typeof st.filename !== "string" || typeof st.isDirty !== "boolean" ||
        (st.path !== undefined && typeof st.path !== "string") ||
        (st.content !== undefined && typeof st.content !== "string") ||
        (st.isDirty && st.content === undefined)) {
      throw new Error("Invalid editor session tab or missing unsaved content.");
    }
    ids.add(st.id);
    tabs.push({
      id: st.id,
      type: st.path ? TabType.LOCAL : TabType.UNTITLED,
      filename: st.filename,
      path: st.path,
      isDirty: st.isDirty,
    });

    if (st.content !== undefined && (st.isDirty || !st.path)) {
      contentCache[st.id] = st.content;
    } else if (!st.path) {
      contentCache[st.id] = "";
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

export async function migrateV1ToV2(): Promise<string> {
  const result = await invoke<string>("migrate_v1_to_v2");
  return result;
}

/**
 * Drain queued absolute paths from cold-start and subsequent CLI launches.
 * The `open-files` event is a null notification to drain this queue, not a payload.
 * Register the listener before the initial drain so arrivals cannot be missed.
 * Later calls return new arrivals, or an empty array if the queue is empty.
 */
export async function takeCliFilePaths(): Promise<string[]> {
  return await invoke<string[]>("take_cli_file_paths");
}
