"use client";

import { useModal } from "@/context/modal-provider";
import { IconEye } from "./Icons";
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
    <button type="button" onClick={handlePreview} className="p-2 mt-5 transition-colors group/view border rounded-md border-white/5 hover:bg-cyan-500/5 hover:border-cyan-500/5 w-fit">
      <IconEye size={32} className="fill-neutral-50 p-0.5 group-hover/view:fill-cyan-600 transition-colors" />
    </button>
  );
}