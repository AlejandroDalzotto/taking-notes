import type { MarkdownEntry } from "./types"

export const validateNoteBody = (entry: MarkdownEntry): [boolean, string | null] => {

  if (!entry.title || !entry.content) return [
    false,
    "Please provide the values for the title and the content."
  ]
  if (entry.title.length < 3 || entry.title.length > 45) return [
    false,
    "The title's length must be between 3 and 25."
  ]
  if (entry.content.length < 3) return [
    false,
    "Please write more than 3 characters in the content."
  ]

  return [true, null]
}