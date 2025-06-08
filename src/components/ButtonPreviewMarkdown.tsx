"use client";

import { useEditor } from "@/context/editor-provider";
import { useModal } from "@/context/modal-provider";
import { IconMarkdown } from "./Icons";
import MarkdownPreviewModal from "./modals/MarkdownPreviewModal";

export default function ButtonPreviewMarkdown() {
  const { open } = useModal();
  const { noteEditorData } = useEditor();

  const handlePreview = () => {
    open(
      <MarkdownPreviewModal content={noteEditorData!.content} />
    );
  };

  return (
    <button
      disabled={!noteEditorData?.content}
      type="button"
      title={noteEditorData?.content ? "Preview Markdown" : "Write something to preview"}
      onClick={handlePreview}
      className="p-2 mt-5 transition-colors border rounded-md disabled:opacity-40 group/view border-white/5 hover:enabled:bg-blue-500/5 hover:enabled:border-blue-500/5 w-fit"
    >
      <IconMarkdown size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-blue-600" />
    </button>
  );
}