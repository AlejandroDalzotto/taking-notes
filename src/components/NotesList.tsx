"use client";

import { useEffect, useState } from "react";
import { create, findAll } from "@/lib/notes.service";
import type { Note, NoteEntry } from "@/lib/types";

export default function NotesList() {

  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await findAll()

      setNotes(data)
    }

    load();
  }, [])

  const createNote = async () => {

    const newEntry: NoteEntry = {
      title: "random title",
      body: "random body"
    }

    await create(newEntry)

    const newValues = await findAll()
    setNotes(newValues)
  }


  return (
    <div>
      <h1>List</h1>
      <div className="flex flex-col gap-y-2">
        {
          notes.map(note => {

            return (
              <div key={note.id}>
                <p>{note.title}</p>
              </div>
            )
          })
        }
      </div>
      <button onClick={createNote}>insert</button>
    </div>
  )
}
