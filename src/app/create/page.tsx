"use client";

import { type FormEvent } from "react";
import { createNote } from "@/lib/notes.service";
import type { FileExtension, NoteEntry } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { extensionsOptions } from "@/lib/constants";

export default function CreateNotePage() {

  const router = useRouter()

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

    toast.error(message)
  }

  return (
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col grow w-full">
        <div className="flex gap-x-4">
          <input
            autoComplete="off"
            name="title"
            placeholder="Title..."
            className="w-full px-3 py-4 pr-10 text-xl transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
          />
          <select name="extension" className="outline-none border-2 peer rounded-md font-extrabold">
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
        <textarea
          autoComplete="off"
          name="content"
          placeholder="Write about something..."
          className="grow px-3 py-4 pr-10 overflow-y-auto text-lg transition-colors bg-transparent outline-none resize-none text-start placeholder:text-neutral-400 hover:bg-white/5"
        />
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">create</button>
      </form>
    </div>
  )
}
