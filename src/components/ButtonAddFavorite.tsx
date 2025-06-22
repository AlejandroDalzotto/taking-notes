"use client";

import { IconHeart } from "@/components/Icons";
import { Note } from "@/lib/definitions";
import { toggleNoteFavoriteStatus } from "@/lib/services/notes";
import { useState } from "react";
import { toast } from "sonner";

// Add onToggle as a prop
export default function ButtonAddFavorite({ note, onToggle }: { note: Note, onToggle: (newStatus: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(false)

  const handler = async () => {
    setIsLoading(true)

    // The current `note.isFavorite` is passed to the backend
    const result = await toggleNoteFavoriteStatus(note.id, note.isFavorite);

    if (!result) {
      toast.error('Error trying to mark note as favorite. Please try again.')
      setIsLoading(false); // Make sure to reset loading state on error
      return;
    }

    // Call the onToggle prop to update the parent's state
    onToggle(!note.isFavorite); // Pass the new status

    setIsLoading(false)
  }

  return (
    <button
      onClick={handler}
      disabled={isLoading}
      className="w-8 h-8 transition-all border rounded-md disabled:opacity-40 disabled:pointer-events-none group/favorite hover:bg-rose-500/5 hover:border-rose-500/5 hover:scale-110 border-white/5 bg-white/5"
    >
      {/* `filled` prop directly uses the note's isFavorite status */}
      <IconHeart size={32} filled={note.isFavorite} className="fill-neutral-50 p-0.5 group-hover/favorite:fill-rose-600 transition-colors" />
    </button>
  )
}