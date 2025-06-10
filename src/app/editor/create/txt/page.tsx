"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import PlainContentField from "@/components/editor/PlainContentField";
import { NoteExtension } from "@/lib/definitions";

export default function CreateTxtNotePage() {

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
