import { useDraft } from "@/context/draft-provider";
import type { Note } from "@/lib/definitions";
import { createNote, editNote } from "@/lib/notes.service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useSaveNote() {
  const router = useRouter();
  const { resetDraft } = useDraft()

  const submit = async (entry: Note, tag?: string) => {
    let error: Error | null = null;
    let message: string | null = null;

    if (tag) {
      [error, message] = await editNote(tag, entry);
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