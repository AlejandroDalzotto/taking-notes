"use client";
import { MAX_LENGTH_TITLE, MIN_LENGTH_TITLE } from "@/lib/constants";
import { edit, getMarkdown, getMarkdownInformation } from "@/lib/markdown.service";
import type { MarkdownEntry } from "@/lib/types";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const ContentWrapped = () => {

  const searchParams = useSearchParams()
  const tag = searchParams.get("tag") ?? ""
  const [title, setTitle] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const router = useRouter()


  useEffect(() => {

    const load = async () => {
      const [makdownContent, information] = await Promise.all([
        getMarkdown(tag),
        getMarkdownInformation(tag),
      ])

      setContent(makdownContent)
      setTitle(information.title)
    }
    load();
  }, [tag])

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newEntry: MarkdownEntry = {
      title,
      content,
    }

    const [anErrorHasHappened, message] = await edit(tag, newEntry)

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
        <div className="relative w-full">
          <input
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            name="title"
            placeholder="Title..."
            className="px-3 py-4 text-xl w-full transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
          />
          <span className={clsx(
            "absolute top-1/2 -translate-y-1/2 right-3 text-lg font-bold transition-colors",
            { "text-red-500/40": title.length < MIN_LENGTH_TITLE || title.length > MAX_LENGTH_TITLE },
            { "text-neutral-600": title.length >= MIN_LENGTH_TITLE && title.length <= MAX_LENGTH_TITLE }
          )}>{title.length}</span>
        </div>
        <textarea
          autoComplete="off"
          value={content}
          onChange={(e) => setContent(e.target.value)}
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