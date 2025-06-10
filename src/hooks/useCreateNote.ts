import { useDraft } from "@/context/draft-provider";
import type { Note } from "@/lib/definitions";
import { createNote } from "@/lib/notes.service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useCreateNote() {
  const router = useRouter();
  const { resetDraft } = useDraft()

  const submit = async (entry: Note) => {

    const [error, message] = await createNote(entry)

    if (!error) {
      toast.success(message)
      resetDraft()
      router.push("/notes")

      return
    }

    toast.error(error.message)
  }

  return { submit };
}