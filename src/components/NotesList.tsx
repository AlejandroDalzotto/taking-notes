"use client";

import { useEffect, useState } from "react";
import { findAll } from "@/lib/notes.service";
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


  return (
    <div className="grid flex-grow w-full grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
      {
        notes.map(note => {

          return (
            <div
              className="flex flex-col w-full p-5 transition-colors border rounded-lg hover:bg-white/10 hover:border-white/15 gap-y-3 h-fit border-white/10 bg-white/5"
              key={note.id}>
              <header className="flex items-center justify-between gap-x-10">
                <p className="text-xl capitalize font-geist-mono">{note.title}</p>
                <span className="text-neutral-400">{note.createdAt}</span>
              </header>
              <p className="truncate text-neutral-200">{note.body}</p>
            </div>
          )
        })
      }
    </div>

  )
}
