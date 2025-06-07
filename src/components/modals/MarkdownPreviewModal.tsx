"use client";
import MarkdownContent from "@/components/MarkdownContent";

export default function MarkdownPreviewModal({ content }: { content: string }) {

  return (
    <div className="flex flex-col gap-y-4" onClick={e => e.stopPropagation()}>
      <div className="max-w-xl w-full max-h-[calc(100vh-100px)] relative bg-neutral-900 overflow-y-auto p-4 border rounded-lg border-white/5">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}