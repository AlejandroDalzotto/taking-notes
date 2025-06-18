"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import PlainContentField from "@/components/editor/PlainContentField";
import { useDraft } from "@/context/draft-provider";
import { type NoteEntry, NoteExtension } from "@/lib/definitions";
import { Log } from "@/lib/services/log";
import { getNote } from "@/lib/services/notes";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

const EditNoteWrapped = () => {

  const searchParams = useSearchParams()
  const id = searchParams.get("id")!
  const { draft, setId, setDraftNote } = useDraft()

  const loadData = async () => {
    if (!draft.id) {
      const [error, result] = await getNote(id, NoteExtension.PLAINTEXT);

      if (!error) {
        const note: NoteEntry = {
          title: result[1].title,
          content: result[0],
          type: NoteExtension.PLAINTEXT
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
      <EditorForm type={NoteExtension.PLAINTEXT} buttons={
        <>
          <ButtonPreviewHtml />
        </>
      } contentField={<PlainContentField />} />
    </EditorContainer>
  )
}

export default function EditTxtNotesPage() {
  return (
    <Suspense>
      <EditNoteWrapped />
    </Suspense>
  )
}
