"use client";

import Editor from "@/components/editor";
import { useCurrent, useEditorActions } from "@/stores/editor";

export default function Home() {
  const current = useCurrent();
  const { addBlank } = useEditorActions();

  if (!current) {
    addBlank();
  }

  return <Editor />;
}
