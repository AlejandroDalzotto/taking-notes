"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import PlainContentField from "@/components/editor/PlainContentField";
import { useDraft } from "@/context/draft-provider";
import { type Note, NoteExtension } from "@/lib/definitions";
import { getNoteContent, getNoteMetadata } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

const EditNoteWrapped = () => {

  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!
  const { draft, setTag, setDraftNote } = useDraft()

  const loadData = async () => {
    if (!draft.tag) {
      const resultContent = await getNoteContent(tag, NoteExtension.PLAINTEXT);
      const resultMetadata = await getNoteMetadata(tag);

      if (resultContent[1] && resultMetadata[1]) {
        const note: Note = {
          title: resultMetadata[1].title,
          content: resultContent[1],
          extension: NoteExtension.PLAINTEXT
        }

        setDraftNote(note)
        setTag(tag)

        return
      }

      const messageError = resultContent[0]?.message ?? resultMetadata[0]?.message ?? "Something went wrong";

      Log.error(messageError)
      toast.error(messageError)
    }

  }

  useEffect(() => {
    loadData();
  }, [tag])

  return (
    <EditorContainer>
      <EditorForm extension={NoteExtension.PLAINTEXT} buttons={
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
