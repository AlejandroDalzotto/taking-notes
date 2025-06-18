"use client";

import { getTotalNotesCount } from "@/lib/services/notes";
import { useEffect, useState } from "react";

export default function NotesCount() {

  const [total, setTotal] = useState<number>(0);

  const fetchTotalNotes = async () => {
    const result = await getTotalNotesCount();
    setTotal(result);
  }

  useEffect(() => {
    fetchTotalNotes();
  }, []);

  return (
    <span className="text-sm whitespace-nowrap border border-neutral-500 p-2 rounded-md font-geist-mono text-neutral-400">
      📝 {total} {total === 1 ? "note" : "notes"}
    </span>
  )
}
