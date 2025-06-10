"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import MDEditor from "@/components/MDEditor";
import { NoteExtension } from "@/lib/definitions";

export default function CreateMdNotePage() {

  return (
    <EditorContainer>
      <EditorForm extension={NoteExtension.MARKDOWN} buttons={
        <>
          <ButtonPreviewHtml />
          <ButtonPreviewMarkdown />
        </>
      } contentField={<MDEditor />} />
    </EditorContainer>
  )
}
