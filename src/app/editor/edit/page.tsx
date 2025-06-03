"use client";
import ErrorDisplay from "@/components/ErrorDisplay";
import { editNote, getNoteContent, getNoteMetadata } from "@/lib/notes.service";
import type { FileExtension, NoteEntry } from "@/lib/definitions";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense } from "react";
import { toast } from "sonner";
import { useAsyncResult } from "@/hooks/useAsyncResult";

const ContentWrapped = () => {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag") ?? "";
  const extension = searchParams.get("ext") ?? "";

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

  const router = useRouter()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: extension as FileExtension,
    };

    const [anErrorHasHappened, message] = await editNote(tag, newEntry)

    if (!anErrorHasHappened) {
      toast.success(message)
      router.push("/notes")

      return
    }

    toast.error(message)
  }

  if (loadingContent || loadingMetadata) return <div>Loading...</div>;
  if (contentError || metadataError)
    return (
      <ErrorDisplay
        message={[contentError?.message, metadataError?.message]
          .filter(Boolean)
          .join("\n")}
      />
    );

  return (
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
          defaultValue={content ?? ""}
          autoComplete="off"
          name="content"
          placeholder="Write about something..."
          className="grow px-3 overflow-y-auto py-4 text-lg transition-colors bg-transparent outline-none text-start placeholder:text-neutral-400 hover:bg-white/5"
        />
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">save</button>
      </form>
    </div>
  )
}

export default function EditNotePage() {

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <Suspense>
        <ContentWrapped />
      </Suspense>
    </div>
  )
}