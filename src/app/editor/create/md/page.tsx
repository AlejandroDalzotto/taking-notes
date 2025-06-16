"use client";

import ButtonPreviewHtml from "@/components/ButtonPreviewHtml";
import ButtonPreviewMarkdown from "@/components/ButtonPreviewMarkdown";
import EditorContainer from "@/components/editor/EditorContainer";
import EditorForm from "@/components/editor/EditorForm";
import MarkdownContentField from "@/components/editor/MarkdownContentField";
import { NoteExtension } from "@/lib/definitions";

export default function CreateMdNotePage() {

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
