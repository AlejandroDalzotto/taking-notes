"use client";

import { useDraft } from "@/context/draft-provider";
import { useModal } from "@/context/modal-provider";
import { IconMarkdown } from "./Icons";
import MarkdownPreviewModal from "./modals/MarkdownPreviewModal";

export default function ButtonPreviewMarkdown() {
  const { open } = useModal();
  const { draft } = useDraft();

  const handlePreview = () => {
    open(
      <MarkdownPreviewModal content={draft.note.content} />
    );
  };

  return (
    <button
      disabled={!draft.note.content}
      type="button"
      title={draft.note.content ? "Preview Markdown" : "Write something to preview"}
      onClick={handlePreview}
      className="p-2 mt-5 transition-colors border rounded-md disabled:opacity-40 group/view border-white/5 hover:enabled:bg-blue-500/5 hover:enabled:border-blue-500/5 w-fit"
    >
      <IconMarkdown size={32} className="fill-neutral-50 p-0.5 transition-colors group-hover/view:in-enabled:fill-blue-600" />
    </button>
  );
}