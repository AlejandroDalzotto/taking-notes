"use client";

import AccessControlPasswordModal from "@/components/modals/AccessControlPasswordModal";
import { useModal } from "@/context/modal-provider";
import type { Note } from "@/lib/definitions";

export default function ButtonProtectNote({ note }: { note: Note }) {
  const { open } = useModal();

  const handler = () => {
    open(
      <AccessControlPasswordModal noteId={note.id} />
    );
  };

  return (
    <button
      onClick={handler}
      className="flex items-center h-8 px-2 py-1 text-sm transition-all border rounded-md cursor-pointer font-geist-mono hover:text-indigo-200 hover:bg-indigo-500/5 hover:border-indigo-500/5 hover:scale-110 border-white/5 bg-white/5 gap-x-1"
    >
      Protect Note
    </button>
  );
}