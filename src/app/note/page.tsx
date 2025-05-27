"use client";

import ErrorDisplay from "@/components/ErrorDisplay";
import Loading from "@/components/Loading";
import MarkdownContent from "@/components/MarkdownContent";
import { getNoteContent, getNoteMetadata, removeNote } from "@/lib/notes.service";
import { FileExtension, NoteMetadata } from "@/lib/types";
import { getLocalDateString } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Apparently not supported.
// https://nextjs.org/docs/app/building-your-application/deploying/static-exports#unsupported-features
// export default function SingleNotePage({ params }: { params: { tag: string } }) {

//   return (
//     <div className="w-full h-full overflow-y-auto p-2 border rounded-lg border-white/5">
//       <MarkdownContent slug={params.slug} />
//     </div>
//   )
// }

export default function SingleNotePage() {

  const [noteMetadata, setNoteMetadata] = useState<NoteMetadata | null>(null)
  const [content, setContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!
  const extension = searchParams.get("ext")! as FileExtension


  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const load = async () => {

      const [errorMetadata, metadata] = await getNoteMetadata(tag)
      const [errorContent, content] = await getNoteContent(tag, extension)
      
      if(errorMetadata) {
        setError(errorMetadata.message)
      } else {
        setNoteMetadata(metadata)
      }

      if(errorContent) {
        setError(errorContent.message)
      } else {
        setContent(content)
      }
      
      setIsLoading(false)
    }
    load();
  }, [tag])

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

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <header className="w-full">
        <h1 className="font-geist-mono font-bold text-lg text-rose-400">
          {noteMetadata ? noteMetadata.title : "undefined (Not found)"}
        </h1>
      </header>
      <section className="w-full h-full overflow-y-auto p-2 lg:px-6 lg:py-4 border rounded-lg border-white/5">
        <MarkdownContent content={content} />
      </section>
      <footer className="w-full flex items-center justify-between">
        <div className="flex gap-x-4 items-center">
          <button
            onClick={deleteNote}
            className="w-8 h-8 p-1 transition-all border rounded-md hover:scale-110 border-white/5 bg-white/5"
          >
            <svg className="w-full h-full fill-neutral-50">
              <use xlinkHref="/sprites.svg#delete" />
            </svg>
          </button>
          <Link
            title={`Edit ${noteMetadata?.title ?? "undefined"}`}
            href={`/edit?tag=${tag}&ext=${extension}`}
            className="w-8 h-8 p-1 transition-all border rounded-md hover:scale-110 border-white/5 bg-white/5"
          >
            <svg className="w-full h-full fill-neutral-50">
              <use xlinkHref="/sprites.svg#edit" />
            </svg>
          </Link>
        </div>
        {noteMetadata && <span className="font-geist-mono text-sm text-neutral-400">last update: {getLocalDateString(noteMetadata.updatedAt)}</span>}
      </footer>
    </div>
  )
}