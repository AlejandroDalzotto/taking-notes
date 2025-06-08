"use client";

import { useEditor } from "@/context/editor-provider";
import { remarkMarkdown } from "@/lib/utils";
import { useRef, useEffect } from "react";

export default function MDEditor() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef<"textarea" | "preview" | null>(null);

  const { noteEditorData, setNoteEditor } = useEditor();

  // Sync preview scroll when textarea scrolls
  function handleTextareaScroll() {
    if (isSyncingScroll.current === "preview") return;
    isSyncingScroll.current = "textarea";
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (textarea && preview) {
      const ratio =
        textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop =
        ratio * (preview.scrollHeight - preview.clientHeight);
    }
    isSyncingScroll.current = null;
  }

  // Sync textarea scroll when preview scrolls
  function handlePreviewScroll() {
    if (isSyncingScroll.current === "textarea") return;
    isSyncingScroll.current = "preview";
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (textarea && preview) {
      const ratio =
        preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      textarea.scrollTop =
        ratio * (textarea.scrollHeight - textarea.clientHeight);
    }
    isSyncingScroll.current = null;
  }

  // When content changes (e.g., pressing Enter), keep scroll in sync
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (textarea && preview) {
      const ratio =
        textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop =
        ratio * (preview.scrollHeight - preview.clientHeight);
    }
  }, [noteEditorData!.content]);

  return (
    <div className="relative flex-1 w-full h-full">
      <textarea
        autoComplete="off"
        name="content"
        value={noteEditorData!.content}
        onChange={(e) => setNoteEditor({
          title: noteEditorData!.title,
          content: e.target.value,
        })}
        spellCheck={false}
        className="absolute inset-0 z-10 p-4 overflow-y-auto font-mono text-lg text-transparent bg-transparent outline-none resize-none caret-blue-50 placeholder:text-white/50 peer/input"
        placeholder="Write something here..."
        ref={textareaRef}
        onScroll={handleTextareaScroll}
      />
      <div
        className="absolute inset-0 p-4 overflow-y-auto font-mono text-lg peer-hover/input:bg-white/[0.01] peer-focus/input:bg-white/5 whitespace-pre-wrap transition-colors bg-transparent rounded"
        dangerouslySetInnerHTML={{
          __html:
            remarkMarkdown(noteEditorData!.content) +
            (noteEditorData!.content.endsWith("\n") ? "<br>" : "")
        }}
        ref={previewRef}
        style={{ pointerEvents: "auto" }}
        onScroll={handlePreviewScroll}
      />
    </div>
  );
}