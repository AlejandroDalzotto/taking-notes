"use client";

import { useDraft } from "@/context/draft-provider";
import { useEffect, useRef } from "react";

export default function EditorContainer({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { draft, setDraftNote } = useDraft()
  const noteRef = useRef(draft.note)

  useEffect(() => {
    noteRef.current = draft.note;
  }, [draft.note]);

  useEffect(() => {
    return () => {
      if (noteRef.current) {
        const note = noteRef.current

        setDraftNote(note);
      }
    };
  }, []);

  return children
}
