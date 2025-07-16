"use client";

import { IconHeart } from "@/components/Icons";
import AccessControlModal from "@/components/modals/AccessControlModal";
import { useModal } from "@/context/modal-provider";
import { NoteExtension, type Note } from "@/lib/definitions";
import { getLocalDateString } from "@/lib/utils";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function NoteLink({ note }: { note: Note }) {
  const router = useRouter()
  const { open } = useModal()

  const handler = () => {

    // if the note is private and has a password then the AccessControlModal will handle the nagivation.
    if (note.accessControl) {
      open(
        <AccessControlModal url={`/note?id=${note.id}&type=${note.type}`} noteId={note.id} />
      )

      return;
    }

    router.push(`/note?id=${note.id}&type=${note.type}`)
  }

  return (
    <button
      onClick={handler}
      className="relative flex flex-col w-full px-4 py-2 transition-colors border rounded-lg hover:bg-white/10 hover:border-white/15 gap-y-2 h-fit border-white/10 bg-white/5"
    >
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-x-5 grow max-w-[80%]">
          <p className="capitalize text-sm max-w-[55%] truncate ">{note.title}</p>
          <span className={clsx("text-xs border p-0.5 rounded-sm ",
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
                <div className="text-xs  p-0.5 rounded-sm border border-neutral-500" key={tag}>
                  {tag}
                </div>
              )

            })
          }
        </div>
        <p title={`created at: ${getLocalDateString(note.updatedAt)}`}
          className="text-sm text-neutral-400">
          {getLocalDateString(note.createdAt)}
        </p>
      </div>
    </button>
  )
}
