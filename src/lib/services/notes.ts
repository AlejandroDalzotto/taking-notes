import type { Note, NoteEntry, NoteExtension } from "@/lib/definitions"
import { Log } from "@/lib/services/log"
import { validateNoteBody } from "@/lib/services/validation"
import { invoke } from "@tauri-apps/api/core"

/**
 * Retrieves the metadata for all notes.
 *
 * Invokes the Tauri command `get_all_notes_metadata` to fetch a record containing
 * information about all notes currently created.
 *
 * @returns A promise that resolves to a record where the keys are note identifiers and the values are {@link Note} objects.
 */
export const getNotesMetadata = async () => {

  const data = await invoke<Record<string, Note>>("get_all_notes_metadata")

  return data;
}

/**
 * Retrieves a specific note by its identifier and extension type.
 *
 * Invokes the Tauri command `get_note` to fetch the note data.
 *
 * @param id - The unique identifier of the note to retrieve.
 * @param type - The extension/type of the note (e.g., "md", "txt").
 * @returns A promise that resolves to a tuple:
 *   - On success: [null, [string, Note]] where the string is the note's content and Note is the note's metadata.
 *   - On failure: [Error, null] with the error encountered during retrieval.
 */
export const getNote = async (id: string, type: NoteExtension): Promise<[Error, null] | [null, [string, Note]]> => {
  try {
    const note = await invoke<[string, Note]>("get_note", { id, type })
    return [null, note];
  } catch (error) {
    return [error as Error, null]
  }

}

/**
 * 
 * Return a filtered list of all markdown's information. Mainly used by search bar.
 */
export const getNotesByTerm = async (term: string) => {
  try {
    const data = await invoke<Record<string, Note>>("search_notes_by_term", { term: term });
    return data
  } catch (e) {
    Log.error("Error getting notes by term", (e as Error).message)
    return []
  }
}

export const createNote = async (entry: NoteEntry): Promise<[Error, null] | [null, string]> => {

  const [areFieldsValid, improvementsToConsider] = validateNoteBody(entry)

  if (!areFieldsValid) {
    return [new Error(improvementsToConsider), null]
  }

  try {

    const isNoteCreated = await invoke<boolean>("create_note", { entry });

    if (!isNoteCreated) {
      throw new Error("Error creating note");
    }

    return [null, "Note created successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
};

export const editNote = async (id: string, entry: NoteEntry): Promise<[Error, null] | [null, string]> => {

  // Validating fields
  const [areFieldsValid, improvementsToConsider] = validateNoteBody(entry)

  if (!areFieldsValid) {
    return [new Error(improvementsToConsider), null]
  }

  try {

    const isNoteEdited = await invoke<boolean>("edit_note", { id, entry });

    if (!isNoteEdited) {
      return [Error('Error trying to edit note.'), null]
    }

    return [null, "Note edited successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}


export const removeNote = async (id: string, type: NoteExtension): Promise<[Error, null] | [null, string]> => {

  try {
    const isNoteDeleted = await invoke<boolean>("remove_note", { id, type })

    if (!isNoteDeleted) {
      return [Error('Error trying to delete note'), null]
    }

    return [null, "Note removed successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
};

export const toggleNoteFavoriteStatus = async (id: string, current: boolean): Promise<boolean> => {
  try {
    const result = await invoke<boolean>('toggle_favorite', { id, current });

    if (!result) {
      throw new Error('Error while trying to toggle note favorite status.');
    }

    return true
  } catch (e) {
    Log.error('Error trying to mark note as favorite.', (e as Error).message);
    return false;
  }
}

export const getTotalNotesCount = async (): Promise<number> => {
  try {
    const count = await invoke<number>("get_total_notes_count");
    return count;
  } catch (e) {
    Log.error("Error getting total notes count", (e as Error).message)
    return 0;
  }
}