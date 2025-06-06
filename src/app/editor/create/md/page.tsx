"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";
import MDEditor from "@/components/MDEditor";
import { FileExtension, NoteEntry } from "@/lib/definitions";
import { createNote } from "@/lib/notes.service";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";
import { toast } from "sonner";

export default function CreateMdNotePage() {

  const router = useRouter()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: FileExtension.MARKDOWN,
    };
    const [error, message] = await createNote(newEntry)

    if (!error) {
      toast.success(message)
      router.push("/notes")

      return
    }

    toast.error(error.message)
  }

  return (
    <form onSubmit={(e) => handleAction(e)} className="flex flex-col w-full grow">
      <input
        spellCheck={false}
        autoComplete="off"
        name="title"
        placeholder="Title..."
        className="w-full p-4 text-xl font-mono transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/[0.01] focus:bg-white/5"
      />
      <MDEditor />

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-x-4">
          <ButtonPreviewHtml />
          <ButtonPreviewMarkdown />
        </div>
        <button type="submit" className="px-3 py-2 mt-5 transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">
          create
        </button>
      </div>
    </form>
  )
}
