"use client";

import { getTotalNotesCount } from "@/lib/notes.service";
import { useEffect, useState } from "react";

export default function NotesCount() {

  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const fetchTotalNotes = async () => {
      const result = await getTotalNotesCount();
      setTotal(result);
    }
    fetchTotalNotes();
  }, []);

  return (
    <span className="text-lg font-geist-mono text-neutral-400">
      📝 {total} {total === 1 ? "note" : "notes"}
    </span>
  )
}
