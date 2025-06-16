"use client";

import { useDraft } from "@/context/draft-provider";
import { NoteExtension } from "@/lib/definitions";

export default function PlainContentField() {
  const { draft, setDraftNote } = useDraft()

  return (
    <textarea
      value={draft.note?.content}
      onChange={(e) => setDraftNote({
        title: draft.note?.title ?? "",
        content: e.target.value,
        type: NoteExtension.PLAINTEXT
      })}
      autoComplete="off"
      name="content"
      spellCheck={false}
      placeholder="Write about something..."
      className="p-4 overflow-y-auto font-mono text-lg transition-colors bg-transparent outline-none resize-none grow text-start placeholder:text-neutral-400 hover:bg-white/5"
    />
  )
}
