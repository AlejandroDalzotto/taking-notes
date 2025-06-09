"use client";

import Loading from "@/components/Loading";
import { useFetchNotesMetadata } from "@/hooks/useFetchNotesMetadata";
import { getLocalDateString } from "@/lib/utils";
import clsx from "clsx";
import Link from "next/link";

export default function NotesList() {

  const { notes, isLoading, error } = useFetchNotesMetadata()

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return <div className="grid w-full h-full text-lg text-center place-content-center font-geist-mono text-neutral-600">
      <p>Unable to load notes.</p>
      <p>Please try again.</p>
    </div>
  }

  if (!notes.length) {
    return <div className="grid w-full h-full place-content-center">
      <p className="text-lg font-geist-mono text-neutral-600">Oops! There are no notes to display.</p>
    </div>
  }

  return (
    <div className="grid content-start w-full grid-cols-1 gap-5 overflow-y-auto grow lg:grid-cols-2 xl:grid-cols-3">
      {
        notes.map(note => {

          return (
            <Link
              href={`/note?tag=${note.tag}&ext=${note.fileExtension}`}
              className="relative flex flex-col w-full p-5 transition-colors border rounded-lg hover:bg-white/10 hover:border-white/15 gap-y-3 h-fit border-white/10 bg-white/5"
              key={note.tag}>
              <header className="relative flex items-center justify-between gap-x-10">
                <p className="text-xl capitalize max-w-[50%] whitespace-nowrap font-geist-mono truncate">{note.title}</p>
                <p title={`created at: ${getLocalDateString(note.createdAt)}`} className="truncate text-neutral-400">{getLocalDateString(note.createdAt)}</p>
              </header>
              <span className={clsx(
                "absolute bottom-1/2 translate-y-1/2 right-5 text-7xl opacity-15 font-geist-mono",
                { "text-blue-500": note.fileExtension === "md" },
                { "text-orange-500": note.fileExtension === "txt" },
              )}>.{note.fileExtension}</span>
            </Link>
          )
        })
      }
    </div>

  )
}
