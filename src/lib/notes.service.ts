import type { NoteExtension, NoteEntry, NoteMetadata } from "./definitions"
import { validateNoteBody } from "@/lib/validation.service"
import { invoke } from "@tauri-apps/api/core"
import { generateRandomUniqueTag } from "@/lib/utils"
import { Log } from "@/lib/services/log"

/**
 * A method that returns a list of information about the files already created.
 * 
 * @returns An array with the information.
 */
export const getNotesMetadata = async () => {

  const data = await invoke<NoteMetadata[]>("get_all_notes_metadata")

  return data;
}

export const getNoteMetadata = async (tag: string): Promise<[Error, null] | [null, NoteMetadata]> => {
  try {
    const markdown = await invoke<NoteMetadata>("get_note_metadata", { tag })
    return [null, markdown];
  } catch (error) {
    return [error as Error, null]
  }

}

/**
 * Get the content of a markdown created.
 */
export const getNoteContent = async (tag: string, extension: string): Promise<[Error, null] | [null, string]> => {
  try {
    const content = await invoke<string>("get_note_content", { tag, fileExtension: extension })

    return [null, content]
  } catch (e) {
    return [e as Error, null]
  }
}

/**
 * 
 * Return a filtered list of all markdown's information. Mainly used by search bar.
 */
export const getNotesByTerm = async (searchTerm: string) => {
  try {
    const data = await invoke<NoteMetadata[]>("search_notes_by_term", { term: searchTerm });
    return data
  } catch (e) {
    Log.error("Error getting notes by term", (e as Error).message)
    return []
  }
}

export const createNote = async (values: NoteEntry): Promise<[Error, null] | [null, string]> => {

  // Validating fields
  const [areFieldsValid, improvementsToConsider] = validateNoteBody(values)

  if (!areFieldsValid) {
    return [new Error(improvementsToConsider!), null]
  }

  const tag = generateRandomUniqueTag();

  try {

    const [hasNoteSucceeded, hasManager] = await Promise.all([
      invoke<boolean>("create_note", { tag, fileExtension: values.fileExtension, content: values.content }),
      invoke<boolean>("create_note_metadata", { tag, title: values.title, fileExtension: values.fileExtension })
    ]);

    if (hasNoteSucceeded !== true || hasManager !== true) {
      throw new Error("Error creating note");
    }

    return [null, "Note created successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
};

export const editNote = async (tag: string, values: NoteEntry): Promise<[Error | null, string]> => {

  // Validating fields
  const [areFieldsValid, improvementsToConsider] = validateNoteBody(values)

  if (!areFieldsValid) {
    return [new Error(improvementsToConsider!), improvementsToConsider!]
  }

  try {

    await Promise.all([
      invoke<boolean>("edit_note", { tag, fileExtension: values.fileExtension, content: values.content }),
      invoke<boolean>("edit_note_metadata", { tag, title: values.title }),
    ]);

    return [null, "Note edited successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), "An error occurred while creating the note."];
  }
}


export const removeNote = async (tag: string, extension: NoteExtension): Promise<[Error, null] | [null, string]> => {

  try {
    await Promise.all([
      invoke<boolean>("remove_note", { tag, fileExtension: extension }),
      invoke<boolean>("remove_note_metadata", { tag })
    ]);

    return [null, "Note removed successfully."];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
};

export const getTotalNotesCount = async (): Promise<number> => {
  try {
    const count = await invoke<number>("get_total_notes_count");
    return count;
  } catch (e) {
    Log.error("Error getting total notes count", (e as Error).message)
    return 0;
  }
}