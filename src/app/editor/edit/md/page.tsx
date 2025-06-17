"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import MarkdownContentField from "@/components/editor/MarkdownContentField";
import { useDraft } from "@/context/draft-provider";
import { NoteExtension, type NoteEntry } from "@/lib/definitions";
import { getNote } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

const Wrapper = () => {

  const searchParams = useSearchParams()
  const id = searchParams.get("id")!
  const { draft, setId, setDraftNote } = useDraft()

  const loadData = async () => {
    if (!draft.id) {
      const [error, result] = await getNote(id, NoteExtension.MARKDOWN);

      if (!error) {
        const note: NoteEntry = {
          title: result[1].title,
          content: result[0],
          type: NoteExtension.MARKDOWN
        }

        setDraftNote(note)
        setId(id)

        return
      }

      const messageError = error.message || "Something went wrong";

      Log.error(messageError)
      toast.error(messageError)
    }

  }

  useEffect(() => {
    loadData();
  }, [id])

  return (
    <EditorContainer>
      <EditorForm type={NoteExtension.MARKDOWN} buttons={
        <>
          <ButtonPreviewHtml />
          <ButtonPreviewMarkdown />
        </>
      } contentField={<MarkdownContentField />} />
    </EditorContainer>
  )
}

export default function EditNotePage() {

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <Suspense>
        <Wrapper />
      </Suspense>
    </div>
  )
}