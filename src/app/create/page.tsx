"use client";

import { type FormEvent, useState } from "react";
import { create } from "@/lib/markdown.service";
import type { MarkdownEntry } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";
import { MAX_LENGTH_TITLE, MIN_LENGTH_CONTENT, MIN_LENGTH_TITLE } from "@/lib/constants";
import { wordCounter } from "@/lib/utils";

export default function CreateNotePage() {

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const router = useRouter()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newEntry: MarkdownEntry = {
      title,
      content,
    }

    const [anErrorHasHappened, message] = await create(newEntry)

    if (!anErrorHasHappened) {
      toast.success(message)
      router.push("/notes")

      return
    }

    toast.error(message)
  }

  return (
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col flex-grow w-full">
        <div className="relative w-full">
          <input
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            name="title"
            placeholder="Title..."
            className="w-full px-3 py-4 pr-10 text-xl transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
          />
          <span className={clsx(
            "absolute top-1/2 -translate-y-1/2 right-3 text-lg font-bold transition-colors",
            { "text-red-500/40": title.length < MIN_LENGTH_TITLE || title.length > MAX_LENGTH_TITLE },
            { "text-neutral-600": title.length >= MIN_LENGTH_TITLE && title.length <= MAX_LENGTH_TITLE }
          )}>{title.length}</span>
        </div>
        <div className="relative flex flex-grow">
          <textarea
            autoComplete="off"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            name="content"
            placeholder="Write about something..."
            className="flex-grow px-3 py-4 pr-10 overflow-y-auto text-lg transition-colors bg-transparent outline-none resize-none text-start placeholder:text-neutral-400 hover:bg-white/5"
          />
          <span className={clsx(
            "absolute top-3 right-3 text-lg font-bold transition-colors",
            { "text-red-500/40": content.length < MIN_LENGTH_CONTENT },
            { "text-neutral-600": content.length >= MIN_LENGTH_CONTENT }
          )}>{wordCounter(content)}</span>
        </div>
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">create</button>
      </form>
    </div>
  )
}
