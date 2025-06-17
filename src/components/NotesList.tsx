"use client";

import { IconHeart } from "@/components/Icons";
import Loading from "@/components/Loading";
import { useFetchNotesMetadata } from "@/hooks/useFetchNotesMetadata";
import { NoteExtension } from "@/lib/definitions";
import { getLocalDateString } from "@/lib/utils";
import clsx from "clsx";
import Link from "next/link";

export default function NotesList() {

  const { metadata: notes, isLoading, error } = useFetchNotesMetadata()

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return <div className="grid w-full h-full text-lg text-center place-content-center font-geist-mono text-neutral-600">
      <p>Unable to load notes.</p>
      <p>Please try again.</p>
    </div>
  }

  if (!notes.size) {
    return <div className="grid w-full h-full place-content-center">
      <p className="text-lg font-geist-mono text-neutral-600">Oops! There are no notes to display.</p>
    </div>
  }

  return (
    <div className="grid w-full content-start grid-cols-1 gap-5 overflow-y-auto grow lg:grid-cols-2 xl:grid-cols-3">
      {
        Array.from(notes.entries())
          .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map(([key, note]) => {

            return (
              <Link
                href={`/note?id=${note.id}&type=${note.type}`}
                className="relative flex flex-col w-full py-2 px-4 transition-colors border rounded-lg hover:bg-white/10 hover:border-white/15 gap-y-2 h-fit border-white/10 bg-white/5"
                key={key}>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-x-5 grow max-w-[80%]">
                    <p className="capitalize text-sm max-w-[55%] truncate font-geist-mono">{note.title}</p>
                    <span className={clsx("text-xs border p-0.5 rounded-sm font-geist-mono",
                      { "border-indigo-500 text-indigo-500 bg-indigo-500/5": note.type === NoteExtension.MARKDOWN },
                      { "border-neutral-500 text-neutral-500 bg-neutral-500/5": note.type === NoteExtension.PLAINTEXT },
                    )}>.{note.type}</span>
                  </div>
                  {note.isFavorite ? (
                    <IconHeart className="fill-red-500" filled={true} size={32} />
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    {
                      note.tags.map(tag => {

                        return (
                          <div className="text-xs font-mono p-0.5 rounded-sm border border-neutral-500" key={tag}>
                            {tag}
                          </div>
                        )

                      })
                    }
                  </div>
                  <p title={`created at: ${getLocalDateString(note.updatedAt)}`}
                    className="text-neutral-400 text-sm">
                    {getLocalDateString(note.createdAt)}
                  </p>
                </div>
              </Link>
            )
          })
      }
    </div>

  )
}
