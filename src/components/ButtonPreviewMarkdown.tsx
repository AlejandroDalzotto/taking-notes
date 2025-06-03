"use client";

import { useModal } from "@/context/modal-provider";
import { IconMarkdown } from "./Icons";
import { useEditor } from "@/context/editor-provider";
import MarkdownPreviewModal from "./modals/MarkdownPreviewModal";

export default function ButtonPreviewMarkdown() {
  const { open } = useModal();
  const { content } = useEditor();

  const handlePreview = () => {
    open(
      <MarkdownPreviewModal content={content} />
    );
  };

  return (
    <button
      disabled={!content}
      type="button"
      title={content ? "Preview Markdown" : "Write something to preview"}
      onClick={handlePreview}
      className="disabled:opacity-40 p-2 mt-5 transition-colors group/view border rounded-md border-white/5 hover:enabled:bg-blue-500/5 hover:enabled:border-blue-500/5 w-fit"
    >
      <IconMarkdown size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-blue-600" />
    </button>
  );
}