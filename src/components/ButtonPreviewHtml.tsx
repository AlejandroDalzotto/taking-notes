"use client";

import { useModal } from "@/context/modal-provider";
import { IconHtml } from "./Icons";
import HtmlPreviewModal from "./modals/HtmlPreviewModal";
import { useEditor } from "@/context/editor-provider";

export default function ButtonPreviewHtml() {
  const { open } = useModal();
  const { content } = useEditor();

  const handlePreview = () => {
    open(
      <HtmlPreviewModal content={content} />
    );
  };

  return (
    <button
      disabled={!content}
      type="button"
      title={content ? "Preview HTML" : "Write something to preview"}
      onClick={handlePreview}
      className="disabled:opacity-40 p-2 mt-5 transition-colors group/view border rounded-md border-white/5 hover:enabled:bg-amber-500/5 hover:enabled:border-amber-500/5 w-fit"
    >
      <IconHtml size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-amber-600" />
    </button>
  );
}