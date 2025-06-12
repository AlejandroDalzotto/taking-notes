"use client";

import { IconDelete, IconEdit } from "@/components/Icons";
import MarkdownContent from "@/components/MarkdownContent";
import { NoteExtension, NoteMetadata } from "@/lib/definitions";
import { getNoteContent, getNoteMetadata, removeNote } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { getLocalDateString } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const Wrapper = () => {
  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!
  const extension = searchParams.get("ext")! as NoteExtension

  const [content, setContent] = useState<string | null>()
  const [metadata, setMetadata] = useState<NoteMetadata | null>(null)

  const load = async () => {
    const [resultContent, resultMetadata] = await Promise.all([getNoteContent(tag, extension), getNoteMetadata(tag)])

    if (resultContent[1] && resultMetadata[1]) {

      setContent(resultContent[1])
      setMetadata(resultMetadata[1])

      return
    }

    const messageError = resultContent[0]?.message ?? resultMetadata[0]?.message ?? "Something went wrong";

    Log.error(messageError)
    toast.error(messageError)
  }

  useEffect(() => {
    load();
  }, [])

  const deleteNote = async () => {

    const [error, message] = await removeNote(tag, extension)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(message)

    // Redirect to notes page.
    window.history.back()

  }

  return (
    <div className="flex flex-col w-full h-full p-1 gap-y-2">
      <header className="w-full">
        <h1 className="text-lg font-bold font-geist-mono text-rose-400">
          {metadata ? metadata.title : "undefined (Not found)"}
        </h1>
      </header>
      <section className="w-full h-full p-2 overflow-y-auto border rounded-lg lg:px-6 lg:py-4 border-white/5">
        {content && metadata && metadata.extension === NoteExtension.MARKDOWN ? (
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
            className="w-8 h-8 transition-all border rounded-md border-white/5 hover:bg-red-500/5 hover:border-red-500/5 group/delete hover:scale-110 bg-white/5"
          >
            <IconDelete size={32} className="fill-neutral-50 p-0.5 group-hover/delete:fill-red-600 transition-colors" />
          </button>
          <Link
            title={`Edit ${metadata?.title ?? "undefined"}`}
            href={`/editor/edit/${extension}?tag=${tag}`}
            className="w-8 h-8 transition-all border rounded-md group/edit hover:bg-green-500/5 hover:border-green-500/5 hover:scale-110 border-white/5 bg-white/5"
          >
            <IconEdit size={32} className="fill-neutral-50 p-0.5 group-hover/edit:fill-green-600 transition-colors" />
          </Link>
        </div>
        {metadata && <span className="text-sm font-geist-mono text-neutral-400">last update: {getLocalDateString(metadata.updatedAt)}</span>}
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