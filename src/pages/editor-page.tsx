import { useCurrent, useEditorActions } from "@/stores/editor";
import { useRef } from "react";

export default function HomePage() {
  const current = useCurrent();
  const { setContent } = useEditorActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!current) {
    return (
      <div className="flex h-full items-center justif,y-center text-neutral-500">
        <p>No file open</p>
      </div>
    );
  }

  return (
    <div className="flex h-full font-mono overflow-hidden flex-col">
      <textarea
        ref={textareaRef}
        className="custom-scrollbar w-full h-full text-neutral-300 bg-transparent outline-none resize-none p-2 overflow-auto"
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          scrollbarGutter: "stable",
        }}
        value={current.content || ""}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        autoFocus
        spellCheck={false}
      />
    </div>
  );
}
