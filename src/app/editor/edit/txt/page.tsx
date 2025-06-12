"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ErrorDisplay from "@/components/ErrorDisplay";
import { useAsyncResult } from "@/hooks/useAsyncResult";
import { NoteExtension, Note } from "@/lib/definitions";
import { editNote, getNoteContent, getNoteMetadata } from "@/lib/notes.service";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense } from "react";
import { toast } from "sonner";

const EditNoteWrapped = () => {

  const router = useRouter()
  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!

  const {
    error: contentError,
    data: contentData,
    loading: loadingContent,
  } = useAsyncResult(
    () => getNoteContent(tag, NoteExtension.PLAINTEXT),
    [tag]
  );

  const {
    error: metadataError,
    data: metadata,
    loading: loadingMetadata,
  } = useAsyncResult(
    () => getNoteMetadata(tag),
    [tag]
  );

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget);

    const newEntry: Note = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      extension: NoteExtension.PLAINTEXT,
    };

    const [error, message] = await editNote(tag, newEntry)

    if (!error) {
      toast.success(message)
      router.push("/notes")

      return
    }

    toast.error(message)
  }

  if (loadingContent || loadingMetadata) return <div>Loading...</div>;
  if (contentError || metadataError || !contentData || !metadata)
    return (
      <ErrorDisplay
        message={[contentError?.message, metadataError?.message]
          .filter(Boolean)
          .join("\n")}
      />
    );

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
        <form onSubmit={(e) => handleAction(e)} className="flex flex-col grow w-full">
          <input
            defaultValue={metadata?.title}
            autoComplete="off"
            name="title"
            placeholder="Title..."
            className="px-3 py-4 text-xl w-full transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
          />
          <textarea
            autoComplete="off"
            name="content"
            spellCheck={false}
            placeholder="Write about something..."
            className="p-4 overflow-y-auto font-mono text-lg transition-colors bg-transparent outline-none resize-none grow text-start placeholder:text-neutral-400 hover:bg-white/5"
          />
          <div className="flex items-center justify-between w-full">
            <ButtonPreviewHtml />
            <button
              type="submit"
              className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit"
            >
              save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditTxtNotesPage() {
  return (
    <Suspense>
      <EditNoteWrapped />
    </Suspense>
  )
}
