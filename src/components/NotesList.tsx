"use client";

import { useEffect, useState } from "react";
import { getNotesMetadata, getNotesByTerm } from "@/lib/notes.service";
import type { NoteMetadata } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getLocalDateString } from "@/lib/utils";
import Loading from "./Loading";

export default function NotesList() {

  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams()
  const search = searchParams.get("search") ?? ""

  useEffect(() => {
    setIsLoading(true)

    const load = async () => {

      try {
        const data = await getNotesMetadata()
        setNotes(data)
      } catch (e) {
        console.error({ error: e })
      } finally {
        setIsLoading(false)
      }

    }

    load();
  }, [])

  useEffect(() => {

    const loadFilteredValues = async () => {

      if (!search) {
        const data = await getNotesMetadata()
        setNotes(data)
        return
      }

      const filteredValues = await getNotesByTerm(search);

      setNotes(filteredValues)
    }

    loadFilteredValues();
  }, [search])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="grid content-start grow w-full grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
      {
        notes.map(note => {

          return (
            <Link
              href={`/note?tag=${note.tag}&ext=${note.fileExtension}`}
              className="relative flex flex-col w-full p-5 transition-colors border rounded-lg hover:bg-white/10 hover:border-white/15 gap-y-3 h-fit border-white/10 bg-white/5"
              key={note.tag}>
              <header className="relative flex items-center justify-between gap-x-10">
                <p className="text-xl capitalize max-w-[50%] whitespace-nowrap font-geist-mono truncate">{note.title}</p>
                <span title={`created at: ${getLocalDateString(note.createdAt)}`} className="text-neutral-400 truncate">{getLocalDateString(note.createdAt)}</span>
              </header>
            </Link>
          )
        })
      }
    </div>

  )
}
