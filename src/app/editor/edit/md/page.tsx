"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import MarkdownContentField from "@/components/editor/MarkdownContentField";
import { useDraft } from "@/context/draft-provider";
import { NoteExtension, type Note } from "@/lib/definitions";
import { getNoteContent, getNoteMetadata } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

const Wrapper = () => {

  const searchParams = useSearchParams()
  const tag = searchParams.get("tag")!
  const { draft, setTag, setDraftNote } = useDraft()

  const loadData = async () => {
    if (!draft.tag) {
      const resultContent = await getNoteContent(tag, NoteExtension.MARKDOWN);
      const resultMetadata = await getNoteMetadata(tag);

      if (resultContent[1] && resultMetadata[1]) {
        const note: Note = {
          title: resultMetadata[1].title,
          content: resultContent[1],
          extension: NoteExtension.MARKDOWN
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
      <EditorForm extension={NoteExtension.MARKDOWN} buttons={
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