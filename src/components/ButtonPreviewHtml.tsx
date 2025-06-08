"use client";

import { useEditor } from "@/context/editor-provider";
import { useModal } from "@/context/modal-provider";
import { IconHtml } from "./Icons";
import HtmlPreviewModal from "./modals/HtmlPreviewModal";

export default function ButtonPreviewHtml() {
  const { open } = useModal();
  const { noteEditorData } = useEditor();

  const handlePreview = () => {
    open(
      <HtmlPreviewModal content={noteEditorData!.content} />
    );
  };

  return (
    <button
      disabled={!noteEditorData?.content}
      type="button"
      title={noteEditorData?.content ? "Preview HTML" : "Write something to preview"}
      onClick={handlePreview}
      className="p-2 mt-5 transition-colors border rounded-md disabled:opacity-40 group/view border-white/5 hover:enabled:bg-amber-500/5 hover:enabled:border-amber-500/5 w-fit"
    >
      <IconHtml size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-amber-600" />
    </button>
  );
}