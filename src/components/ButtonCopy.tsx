"use client";

import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { IconCopy } from "./Icons";
import { toast } from "sonner";

export default function ButtonCopy({ content }: { content: string }) {
  const handleClick = async () => {
    if (!content) return;

    // Write content to clipboard
    writeText(content).then(() => {
      toast.success("Content copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy content to clipboard");
    });
  }

  return (
    <button
      type="button"
      title="Copy to clipboard"
      onClick={handleClick}
      className="disabled:opacity-40 p-2 transition-colors group/view border rounded-md border-white/5 hover:enabled:bg-white/5 hover:enabled:border-white/5 w-fit"
    >
      <IconCopy size={32} className="fill-neutral-50/50 p-0.5 transition-colors group-hover/view:in-enabled:fill-white" />
    </button>
  )
}