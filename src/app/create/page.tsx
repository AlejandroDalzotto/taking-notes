"use client";

import { type FormEvent, useState } from "react";
import { createNote } from "@/lib/notes.service";
import type { FileExtension, NoteEntry } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateNotePage() {

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const router = useRouter()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: formData.get("extension") as FileExtension,
    };

    const [anErrorHasHappened, message] = await createNote(newEntry)

    if (!anErrorHasHappened) {
      toast.success(message)
      router.push("/notes")

      return
    }

    toast.error(message)
  }

  return (
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col grow w-full">
        <input
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          name="title"
          placeholder="Title..."
          className="w-full px-3 py-4 pr-10 text-xl transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
        />
        <select name="extension">
          <option value="txt">plain text</option>
          <option value="md">markdown</option>
        </select>
        <textarea
          autoComplete="off"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          name="content"

          placeholder="Write about something..."
          className="grow px-3 py-4 pr-10 overflow-y-auto text-lg transition-colors bg-transparent outline-none resize-none text-start placeholder:text-neutral-400 hover:bg-white/5"
        />
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">create</button>
      </form>
    </div>
  )
}
