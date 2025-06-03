"use client";
import ErrorDisplay from "@/components/ErrorDisplay";
import { editNote, getNoteContent, getNoteMetadata } from "@/lib/notes.service";
import { FileExtension, NoteEntry } from "@/lib/definitions";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect } from "react";
import { toast } from "sonner";
import { useAsyncResult } from "@/hooks/useAsyncResult";
import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import MDEditor from "@/components/MDEditor";
import { useEditor } from "@/context/editor-provider";

const ContentWrapped = () => {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag") ?? "";
  const extension = searchParams.get("ext") ?? "";

  const {
    error: contentError,
    data: contentData,
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

  const { content, setContent, setInitialContent } = useEditor();

  const router = useRouter()

  useEffect(() => {
    if (contentData) {
      setInitialContent(contentData);
    }
  }, [contentData]);

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: extension as FileExtension,
    };

    console.log("New entry to save:", newEntry);

    const [anErrorHasHappened, message] = await editNote(tag, newEntry)

    if (!anErrorHasHappened) {
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
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col grow w-full">
        <input
          defaultValue={metadata?.title}
          autoComplete="off"
          name="title"
          placeholder="Title..."
          className="px-3 py-4 text-xl w-full transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
        />
        {extension === FileExtension.MARKDOWN ? (
          <MDEditor />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoComplete="off"
            name="content"
            spellCheck={false}
            placeholder="Write about something..."
            className="p-4 overflow-y-auto font-mono text-lg transition-colors bg-transparent outline-none resize-none grow text-start placeholder:text-neutral-400 hover:bg-white/5"
          />
        )}
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