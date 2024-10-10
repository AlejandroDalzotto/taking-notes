"use client";

import { useEffect, useState } from "react";
import { findAll, remove } from "@/lib/notes.service";
import type { Note } from "@/lib/types";

export default function NotesList() {

  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await findAll()

      setNotes(data)
    }

    load();
  }, [])

  const deleteNote = async (id: string) => {

    await remove(id)

    const newData = await findAll()
    setNotes(newData)
  }


  return (
    <div className="grid content-start flex-grow w-full grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
      {
        notes.map(note => {

          return (
            <div
              className="relative flex flex-col w-full p-5 transition-colors border rounded-lg group/card hover:bg-white/10 hover:border-white/15 gap-y-3 h-fit border-white/10 bg-white/5"
              key={note.id}>
              <header className="flex items-center justify-between gap-x-10">
                <p className="text-xl capitalize font-geist-mono truncate">{note.title}</p>
                <span className="text-neutral-400">{note.createdAt}</span>
              </header>
              <p className="truncate text-neutral-200">{note.body}</p>
              <button
                onClick={() => deleteNote(note.id)}
                title={`delete note: ${note.title}`}
                className="absolute w-8 h-8 p-1 transition-all border rounded-md opacity-0 hover:scale-110 bottom-2 right-2 border-white/5 bg-white/5 group-hover/card:opacity-100"
              >
                <svg className="w-full h-full fill-neutral-50">
                  <use xlinkHref="/sprites.svg#delete" />
                </svg>
              </button>
            </div>
          )
        })
      }
    </div>

  )
}
