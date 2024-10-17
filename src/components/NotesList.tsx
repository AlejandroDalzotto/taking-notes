"use client";

import { useEffect, useState } from "react";
import { getMarkdownListInformation, remove } from "@/lib/markdown.service";
import type { MarkdownFileInformation } from "@/lib/types";
import Link from "next/link";

export default function NotesList() {

  const [notes, setNotes] = useState<MarkdownFileInformation[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getMarkdownListInformation()

      setNotes(data)
    }

    load();
  }, [])

  const deleteNote = async (slug: string) => {

    await remove(slug)

    const newData = await getMarkdownListInformation()
    setNotes(newData)
  }


  return (
    <div className="grid content-start flex-grow w-full grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
      {
        notes.map(note => {

          return (
            <Link
              href={`/note?slug=${note.slug}`}
              className="relative flex flex-col w-full p-5 transition-colors border rounded-lg group/card hover:bg-white/10 hover:border-white/15 gap-y-3 h-fit border-white/10 bg-white/5"
              key={note.id}>
              <header className="flex items-center justify-between gap-x-10">
                <p className="text-xl capitalize font-geist-mono truncate">{note.title}</p>
                <span className="text-neutral-400">{note.createdAt}</span>
              </header>
              <button
                onClick={() => deleteNote(note.slug)}
                title={`delete note: ${note.title}`}
                className="absolute w-8 h-8 p-1 transition-all border rounded-md opacity-0 hover:scale-110 bottom-2 right-2 border-white/5 bg-white/5 group-hover/card:opacity-100"
              >
                <svg className="w-full h-full fill-neutral-50">
                  <use xlinkHref="/sprites.svg#delete" />
                </svg>
              </button>
            </Link>
          )
        })
      }
    </div>

  )
}
