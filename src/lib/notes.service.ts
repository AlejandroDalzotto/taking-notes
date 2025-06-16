import { Log } from "@/lib/services/log"
import { validateNoteBody } from "@/lib/validation.service"
import { invoke } from "@tauri-apps/api/core"
import type { Note, NoteEntry, NoteExtension } from "./definitions"

/**
 * A method that returns a list of information about the files already created.
 * 
 * @returns An array with the information.
 */
export const getNotesMetadata = async () => {

  const data = await invoke<Record<string, Note>>("get_all_notes_metadata")

  return data;
}

export const getNoteMetadata = async (tag: string): Promise<[Error, null] | [null, Note]> => {
  try {
    const markdown = await invoke<Note>("get_note_metadata", { tag })
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
    const data = await invoke<Note[]>("search_notes_by_term", { term: searchTerm });
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