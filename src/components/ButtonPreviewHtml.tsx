"use client";

import HtmlPreviewModal from "@/components/modals/HtmlPreviewModal";
import { useDraft } from "@/context/draft-provider";
import { useModal } from "@/context/modal-provider";
import { IconHtml } from "./Icons";

export default function ButtonPreviewHtml() {
  const { open } = useModal();
  const { draft } = useDraft();

  const handlePreview = () => {
    open(
      <HtmlPreviewModal content={draft.note.content} />
    );
  };

  return (
    <button
      disabled={!draft.note.content}
      type="button"
      title={draft.note.content ? "Preview HTML" : "Write something to preview"}
      onClick={handlePreview}
      className="p-2 mt-5 transition-colors border rounded-md disabled:opacity-40 group/view border-white/5 hover:enabled:bg-amber-500/5 hover:enabled:border-amber-500/5 w-fit"
    >
      <IconHtml size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-amber-600" />
    </button>
  );
}