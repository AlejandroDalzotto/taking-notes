import type { NoteMetadata } from "@/lib/definitions";
import { getNotesByTerm, getNotesMetadata } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const useFetchNotesMetadata = () => {
  const [metadata, setMetadata] = useState<NoteMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const searchParams = useSearchParams()
  const search = searchParams.get("search") ?? ""

  const fetchNotes = async () => {
    setError(false)
    setIsLoading(true)

    try {

      if (!search) {
        const data = await getNotesMetadata()
        setMetadata(data)
        return
      }

      const filteredValues = await getNotesByTerm(search);
      setMetadata(filteredValues)
    } catch (e) {
      Log.error("Error loading notes metadata", (e as Error).message)
      setError(true)
    } finally {
      setIsLoading(false)
    }

  }

  useEffect(() => {
    fetchNotes();
  }, [search])

  return { metadata, isLoading, error }
}