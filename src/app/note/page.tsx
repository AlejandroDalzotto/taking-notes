"use client";

import ErrorDisplay from "@/components/ErrorDisplay";
import Loading from "@/components/Loading";
import MarkdownContent from "@/components/MarkdownContent";
import { getNoteContent, getNoteMetadata, removeNote } from "@/lib/notes.service";
import { FileExtension } from "@/lib/definitions";
import { getLocalDateString } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAsyncResult } from "@/hooks/useAsyncResult";

export default function SingleNotePage() {

  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!
  const extension = searchParams.get("ext")! as FileExtension

  const {
    error: contentError,
    data: content,
    loading: loadingContent,
  } = useAsyncResult(
    () => getNoteContent(tag, extension),
    [tag, extension]
  );

  const {
    error: metadataError,
    data: metadata,
    loading: loadingMetadata,
  } = useAsyncResult(
    () => getNoteMetadata(tag),
    [tag]
  );

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

  if (loadingContent || loadingMetadata) return <Loading />;
  if (contentError || metadataError)
    return (
      <ErrorDisplay
        message={[contentError?.message, metadataError?.message]
          .filter(Boolean)
          .join("\n")}
      />
    );

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <header className="w-full">
        <h1 className="font-geist-mono font-bold text-lg text-rose-400">
          {metadata ? metadata.title : "undefined (Not found)"}
        </h1>
      </header>
      <section className="w-full h-full overflow-y-auto p-2 lg:px-6 lg:py-4 border rounded-lg border-white/5">
        {content && <MarkdownContent content={content} />}
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
            title={`Edit ${metadata?.title ?? "undefined"}`}
            href={`/edit?tag=${tag}&ext=${extension}`}
            className="w-8 h-8 p-1 transition-all border rounded-md hover:scale-110 border-white/5 bg-white/5"
          >
            <svg className="w-full h-full fill-neutral-50">
              <use xlinkHref="/sprites.svg#edit" />
            </svg>
          </Link>
        </div>
        {metadata && <span className="font-geist-mono text-sm text-neutral-400">last update: {getLocalDateString(metadata.updatedAt)}</span>}
      </footer>
    </div>
  )
}