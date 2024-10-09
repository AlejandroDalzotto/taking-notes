import { lazy } from "react"

const NotesList = lazy(() => import("@/components/NotesList"));

export default function NotesPage() {
  return (
    <div className="flex pt-20 items-start flex-col min-h-full max-h-full bg-white/[.02] rounded-xl p-4">
      <header className="w-full">
        <h1 className="mb-5 text-3xl font-geist-mono">Notes list</h1>
        <p className="mb-5 text-lg">There you have all the notes you&apos;ve written</p>
      </header>
      <NotesList />
    </div>
  )
}
