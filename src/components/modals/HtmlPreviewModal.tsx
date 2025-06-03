"use client";
import { marked } from "marked";
import { highlight } from "sugar-high";

export default function HtmlPreviewModal({ content }: { content: string }) {

  const html = marked(content, {
    async: false,
  })

  const highlightedHtml = highlight(html)

  return (
    <div className="flex flex-col gap-y-4">
      <span className="text-orange-500 font-mono text-lg font-bold">.html</span>
      <div className="max-w-xl w-full max-h-[calc(100vh-100px)] relative bg-neutral-900 overflow-y-auto p-4 border rounded-lg border-white/5">
        <div
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          className="whitespace-pre-wrap w-full overflow-y-auto prose prose-invert prose-img:rounded-lg prose-video:rounded-lg"
        />
      </div>
    </div>
  );
}