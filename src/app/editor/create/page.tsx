"use client";

import { useState, type FormEvent } from "react";
import { createNote } from "@/lib/notes.service";
import { FileExtension, NoteEntry } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { extensionsOptions } from "@/lib/constants";
import MDEditor from "@/components/MDEditor";
import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import { useEditor } from "@/context/editor-provider";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";

export default function CreateNotePage() {

  const router = useRouter()
  const [extension, setExtension] = useState<FileExtension>(FileExtension.MARKDOWN);

  const { content, setContent } = useEditor()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);

    const newEntry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      fileExtension: formData.get("extension") as FileExtension,
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
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col w-full grow">
        <div className="flex gap-x-4">
          <input
            spellCheck={false}
            autoComplete="off"
            name="title"
            placeholder="Title..."
            className="w-full p-4 text-xl font-mono transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/[0.01] focus:bg-white/5"
          />
          <select onChange={(e) => setExtension(e.target.value as FileExtension)} name="extension" className="font-extrabold outline-none transition-colors hover:bg-white/[0.01] focus:bg-white/5">
            {
              extensionsOptions.map(extension => {
                return (
                  <option
                    key={extension.value}
                    value={extension.value}
                    className={extension.colorClass + " font-extrabold"}
                  >
                    .{extension.value}
                  </option>
                )
              })
            }
          </select>
        </div>
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
          <div className="flex items-center gap-x-4">
            <ButtonPreviewHtml />
            {extension === FileExtension.MARKDOWN && (
              <ButtonPreviewMarkdown />
            )}
          </div>
          <button type="submit" className="px-3 py-2 mt-5 transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">
            create
          </button>
        </div>
      </form>
    </div>
  )
}
