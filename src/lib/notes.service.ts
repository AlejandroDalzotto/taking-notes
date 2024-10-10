import { BaseDirectory, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs"
import type { Note, NoteEntry } from "./types"

export const findAll = async (): Promise<Note[]> => {

  const isFileCreated = await exists("db.json", { baseDir: BaseDirectory.AppLocalData })

  if (!isFileCreated) {
    return []
  }

  const rawData = await readTextFile("db.json", { baseDir: BaseDirectory.AppLocalData })
  const data = JSON.parse(rawData)

  return data;
}

export const create = async (values: NoteEntry) => {

  const now = new Date().toLocaleDateString()
  const id = crypto.randomUUID()

  const newEntry: Note = {
    id,
    ...values,
    createdAt: now,
    updatedAt: now
  }

  const previousValues = await findAll()

  await writeTextFile("db.json", JSON.stringify([...previousValues, newEntry]), {
    baseDir: BaseDirectory.AppLocalData
  })
}

export const remove = async (id: string) => {

  const allValues = await findAll()

  const newValues = allValues.filter(value => value.id !== id)

  await writeTextFile("db.json", JSON.stringify(newValues), {
    baseDir: BaseDirectory.AppLocalData
  })

}