"use client";
import { NoteExtension, type NoteEntry } from "@/lib/definitions";
import { createContext, useContext, useState } from "react";

type Draft = {
  note: NoteEntry;
  id: string | null;
}

type DraftContextState = {
  draft: Draft;
}

type DraftContextAction = {
  setDraftNote: (value: NoteEntry) => void;
  setId: (value: string) => void;
  resetDraft: VoidFunction;
}

type DraftContextType = DraftContextState & DraftContextAction

const initialState = {
  id: null,
  note: {
    title: "",
    content: "",
    type: NoteExtension.PLAINTEXT
  },
}

export const DraftContext = createContext<DraftContextType>({
  draft: initialState,
  setDraftNote: () => { },
  resetDraft: () => { },
  setId: () => { },
})

export default function DraftProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [state, setState] = useState<Draft>(initialState)

  const setDraftNote = (note: NoteEntry) => {
    setState((prev) => ({ note, id: prev.id }))
  }

  const setId = (id: string) => {
    setState((prev) => ({ note: prev.note, id }))
  }

  const resetDraft = () => {
    setState(initialState)
  }

  return (
    <DraftContext.Provider value={{
      draft: state,
      resetDraft,
      setDraftNote,
      setId
    }}>
      {children}
    </DraftContext.Provider>
  )
}


export const useDraft = (): DraftContextType => {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error("useDraft must be used within an DraftProvider");
  }
  return context;
};