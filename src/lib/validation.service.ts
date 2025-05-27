import { MAX_LENGTH_TITLE, MIN_LENGTH_CONTENT, MIN_LENGTH_TITLE } from "./constants"
import type { NoteEntry } from "./types"

export const validateNoteBody = (entry: NoteEntry): [false, string] | [true, null] => {

  if (!entry.title || !entry.content) return [
    false,
    "Please provide the values for the title and the content."
  ]
  if (entry.title.length < MIN_LENGTH_TITLE || entry.title.length > MAX_LENGTH_TITLE) return [
    false,
    `The title's length must be between ${MIN_LENGTH_TITLE} and ${MAX_LENGTH_TITLE}.`
  ]
  if (entry.content.length < MIN_LENGTH_CONTENT) return [
    false,
    `Please write more than ${MIN_LENGTH_CONTENT} characters in the content.`
  ]

  return [true, null]
}