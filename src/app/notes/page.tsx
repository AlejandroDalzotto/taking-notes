import { lazy } from "react"

const NotesList = lazy(() => import("@/components/NotesList"));

export default function NotesPage() {
  return (
    <div>
      <NotesList />
    </div>
  )
}
