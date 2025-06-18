import { useDraft } from "@/context/draft-provider";
import type { NoteEntry } from "@/lib/definitions";
import { createNote, editNote } from "@/lib/services/notes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useSaveNote() {
  const router = useRouter();
  const { resetDraft } = useDraft()

  const submit = async (entry: NoteEntry, id?: string) => {
    let error: Error | null = null;
    let message: string | null = null;

    if (id) {
      [error, message] = await editNote(id, entry);
    } else {
      [error, message] = await createNote(entry);
    }

    if (!error) {
      toast.success(message);
      resetDraft();
      router.push("/notes");
      return;
    }

    toast.error(error.message);
  }

  return { submit };
}