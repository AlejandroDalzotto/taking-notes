import type { Note } from "@/lib/definitions";
import { getNotesByTerm, getNotesMetadata } from "@/lib/notes.service";
import { Log } from "@/lib/services/log";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const useFetchNotesMetadata = () => {
  const [metadata, setMetadata] = useState<Map<string, Note>>(new Map())
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const searchParams = useSearchParams()
  const search = searchParams.get("search")

  const fetchNotes = async () => {
    setError(false)
    setIsLoading(true)

    try {

      if (!search) {
        const data = await getNotesMetadata()

        Object.entries(data).forEach(([key, value]) => {
          setMetadata(map => new Map(map.set(key, value)));
        });
        return
      }
      const filteredValues = await getNotesByTerm(search);

      const map = new Map()
      Object.entries(filteredValues).forEach(([key, value]) => {
        map.set(key, value);
      });

      setMetadata(map)
    } catch (e) {
      Log.error("Error loading notes metadata", (e as Error).message)
      console.log({ e })
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