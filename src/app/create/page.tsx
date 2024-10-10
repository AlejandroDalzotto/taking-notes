"use client";

import { useState } from "react";
import { create } from "@/lib/notes.service";
import type { NoteEntry } from "@/lib/types";

export default function CreateNotePage() {

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  const handleAction = async () => {

    const newEntry: NoteEntry = {
      title,
      body,
    }

    await create(newEntry)

  }

  return (
    <div className="flex flex-col items-start max-h-full min-h-full p-4 pt-20">
      <form onSubmit={handleAction} className="flex flex-col flex-grow w-full">
        <input
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          name="title"
          placeholder="Title..."
          className="px-3 py-4 text-xl transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/5"
        />
        <input
          autoComplete="off"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          name="body"
          placeholder="Write about something..."
          className="flex-grow px-3 py-4 text-lg transition-colors bg-transparent outline-none text-start placeholder:text-neutral-400 hover:bg-white/5"
        />
        <button className="px-3 py-2 mt-5 ml-auto transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">create</button>
      </form>
    </div>
  )
}