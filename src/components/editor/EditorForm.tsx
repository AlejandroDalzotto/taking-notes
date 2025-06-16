"use client";

import { useDraft } from "@/context/draft-provider";
import { useSaveNote } from "@/hooks/useSaveNote";
import { NoteExtension, type NoteEntry } from "@/lib/definitions";
import { FormEvent } from "react";

type Props = {
  contentField: React.ReactNode,
  buttons: React.ReactNode,
  type: NoteExtension,
}

export default function EditorForm({ contentField, buttons, type }: Props) {
  const { submit } = useSaveNote();
  const { draft, setDraftNote } = useDraft()

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);

    const entry: NoteEntry = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      type: NoteExtension.PLAINTEXT,
    };

    await submit(entry)
  }

  return (
    <form onSubmit={handleAction} className="flex flex-col w-full grow">
      <input
        value={draft.note?.title}
        onChange={(e) => setDraftNote({
          title: e.target.value,
          content: draft.note?.content ?? "",
          type,
        })}
        spellCheck={false}
        autoComplete="off"
        name="title"
        placeholder="Title..."
        className="w-full p-4 text-xl font-mono transition-colors bg-transparent outline-none placeholder:text-neutral-400 hover:bg-white/[0.01] focus:bg-white/5"
      />
      {contentField}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-x-4">
          {buttons}
        </div>
        <button type="submit" className="px-3 py-2 mt-5 transition-colors border rounded-md border-white/5 hover:bg-white/5 w-fit">
          save
        </button>
      </div>
    </form>
  )
}
