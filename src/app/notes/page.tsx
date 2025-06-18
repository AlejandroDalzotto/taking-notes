import NotesCount from "@/components/NotesCount";
import NotesList from "@/components/NotesList";
import SearchBar from "@/components/SearchBar";
import { Suspense } from "react";

export default function NotesPage() {
  return (
    <div className="flex items-start flex-col min-h-full w-full max-h-full bg-white/[.02] rounded-xl p-4">
      <section className="flex items-center justify-between w-full mb-5 gap-x-5">
        <Suspense>
          <SearchBar />
        </Suspense>
        <NotesCount />
      </section>
      <Suspense>
        <NotesList />
      </Suspense>
    </div>
  )
}
