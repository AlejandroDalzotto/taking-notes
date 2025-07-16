"use client";

import Loading from "@/components/Loading";
import NoteLink from "@/components/NoteLink";
import { useFetchNotesMetadata } from "@/hooks/useFetchNotesMetadata";

export default function NotesList() {

  const { metadata: notes, isLoading, error } = useFetchNotesMetadata()

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return <div className="grid w-full h-full text-lg text-center place-content-center  text-neutral-600">
      <p>Unable to load notes.</p>
      <p>Please try again.</p>
    </div>
  }

  if (!notes.size) {
    return <div className="grid w-full h-full place-content-center">
      <p className="text-lg  text-neutral-600">Oops! There are no notes to display.</p>
    </div>
  }

  return (
    <div className="grid content-start w-full grid-cols-1 gap-5 overflow-y-auto grow lg:grid-cols-2 xl:grid-cols-3">
      {
        Array.from(notes.entries())
          .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map(([key, note]) => {

            return (
              <NoteLink note={note} key={key} />
            )
          })
      }
    </div>

  )
}
