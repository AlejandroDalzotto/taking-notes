"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import { useDraft } from "@/context/draft-provider";
import { useEditor } from "@/context/editor-provider";
import { FileExtension, NoteEntry } from "@/lib/definitions";
import { createNote } from "@/lib/notes.service";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";

export default function CreateTxtNotePage() {

  const router = useRouter()
  const { content, setContent, setInitialContent } = useEditor()
  const { setDraft, draft } = useDraft()
  const contentRef = useRef(content)


  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: FileExtension.PLAINTEXT,
    };
    const [error, message] = await createNote(newEntry)

    if (!error) {
      toast.success(message)
      setContent("")
      router.push("/notes")

      return
    }

    toast.error(error.message)
  }

  useEffect(() => {
    if (draft) {
      setInitialContent(draft)
    }
  }, [])

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    return () => {
      if (contentRef.current) {
        setDraft(contentRef.current, FileExtension.PLAINTEXT);
      }
    };
  }, []);

  return (
    <form onSubmit={(e) => handleAction(e)} className="flex flex-col w-full grow">
      <input
        spellCheck={false}
        autoComplete="off"
        name="title"
        placeholder="Title..."
        className="w-full p-4 text-xl font-mono transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/[0.01] focus:bg-white/5"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoComplete="off"
        name="content"
        spellCheck={false}
        placeholder="Write about something..."
        className="p-4 overflow-y-auto font-mono text-lg transition-colors bg-transparent outline-none resize-none grow text-start placeholder:text-neutral-400 hover:bg-white/5"
      />
      <div className="flex items-center justify-between w-full">
        <ButtonPreviewHtml />
        <button type="submit" className="px-3 py-2 mt-5 transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">
          create
        </button>
      </div>
    </form>
  )
}
