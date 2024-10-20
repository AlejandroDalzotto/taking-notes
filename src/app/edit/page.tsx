"use client";
import { create, getMarkdown } from "@/lib/markdown.service";
import type { MarkdownEntry } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const ContentWrapped = () => {

  const searchParams = useSearchParams()
  const slug = searchParams.get("slug") ?? ""
  const [title, setTitle] = useState<string>(slug.replaceAll("-", " "))
  const [content, setContent] = useState<string>("")
  const router = useRouter()


  useEffect(() => {

    const load = async () => {
      const makdownContent = await getMarkdown(slug)

      setContent(makdownContent)
    }
    load();
  }, [slug])

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
    }

    toast.error(message)
  }

  return (
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={(e) => handleAction(e)} className="flex flex-col flex-grow w-full">
        <input
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          name="title"
          placeholder="Title..."
          className="px-3 py-4 text-xl transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
        />
        <textarea
          autoComplete="off"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          name="content"
          placeholder="Write about something..."
          className="flex-grow px-3 overflow-y-auto py-4 text-lg transition-colors bg-transparent outline-none text-start placeholder:text-neutral-400 hover:bg-white/5"
        />
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">create</button>
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