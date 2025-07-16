"use client";

import ButtonAddFavorite from "@/components/ButtonAddFavorite";
import ButtonProtectNote from "@/components/ButtonProtectNote";
import { IconDelete, IconEdit } from "@/components/Icons";
import MarkdownContent from "@/components/MarkdownContent";
import { Note, NoteExtension } from "@/lib/definitions";
import { Log } from "@/lib/services/log";
import { getNote, removeNote } from "@/lib/services/notes";
import { getLocalDateString } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const Wrapper = () => {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")!
  const type = searchParams.get("type")! as NoteExtension

  const [content, setContent] = useState<string | null>()
  const [metadata, setMetadata] = useState<Note | null>(null)

  const load = async () => {
    const [error, result] = await getNote(id, type)

    if (!error) {
      setContent(result[0])
      setMetadata(result[1])
      return
    }

    const messageError = error.message || "Something went wrong";
    Log.error(messageError)
    toast.error(messageError)
  }

  // Handler for when the favorite status is toggled
  const handleFavoriteToggle = (newStatus: boolean) => {
    if (metadata) {
      setMetadata({
        ...metadata,
        isFavorite: newStatus,
      });
    }
  };

  useEffect(() => {
    load();
  }, [id, type])

  const deleteNote = async () => {
    const [error, message] = await removeNote(id, type)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(message)
    window.history.back()
  }

  return (
    <div className="flex flex-col w-full h-full p-1 gap-y-2">
      <header className="w-full">
        <h1 className="text-lg font-bold  text-rose-400">
          {metadata ? metadata.title : "undefined (Not found)"}
        </h1>
      </header>
      <section className="w-full h-full p-2 overflow-y-auto border rounded-lg lg:px-6 lg:py-4 border-white/5">
        {content && metadata && metadata.type === NoteExtension.MARKDOWN ? (
          <MarkdownContent content={content} />
        ) : (
          <div className="prose whitespace-pre-line prose-invert prose-img:rounded-lg prose-video:rounded-lg">
            {content}
          </div>
        )}
      </section>
      <footer className="flex items-center justify-between w-full">
        <div className="flex items-center gap-x-4">
          <button
            onClick={deleteNote}
            className="w-8 h-8 transition-all border rounded-md cursor-pointer border-white/5 hover:bg-red-500/5 hover:border-red-500/5 group/delete hover:scale-110 bg-white/5"
          >
            <IconDelete size={32} className="fill-neutral-50 p-0.5 group-hover/delete:fill-red-600 transition-colors" />
          </button>
          <Link
            title={`Edit ${metadata?.title ?? "undefined"}`}
            href={`/editor/edit/<span class="math-inline">\{type\}?id\=</span>{id}`}
            className="w-8 h-8 transition-all border rounded-md group/edit hover:bg-green-500/5 hover:border-green-500/5 hover:scale-110 border-white/5 bg-white/5"
          >
            <IconEdit size={32} className="fill-neutral-50 p-0.5 group-hover/edit:fill-green-600 transition-colors" />
          </Link>
          {metadata ? (
            <>
              <ButtonAddFavorite note={metadata} onToggle={handleFavoriteToggle} />

              {!metadata.accessControl ? (
                <ButtonProtectNote note={metadata} />
              ) : null}
            </>
          ) : null}
        </div>
        {metadata && <span className="text-sm  text-neutral-400">last update: {getLocalDateString(metadata.updatedAt)}</span>}
      </footer>
    </div>
  )
};

export default function SingleNotePage() {

  return (
    <Suspense>
      <Wrapper />
    </Suspense>
  )
}