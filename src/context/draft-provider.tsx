"use client";
import { NoteExtension, type Note } from "@/lib/definitions";
import { createContext, useContext, useState } from "react";

type Draft = {
  note: Note;
  tag: string | null;
}

type DraftContextState = {
  draft: Draft;
}

type DraftContextAction = {
  setDraftNote: (value: Note) => void;
  setTag: (value: string) => void;
  resetDraft: VoidFunction;
}

type DraftContextType = DraftContextState & DraftContextAction

const initialState = {
  tag: null,
  note: {
    title: "",
    content: "",
    extension: NoteExtension.PLAINTEXT
  },
}

export const DraftContext = createContext<DraftContextType>({
  draft: initialState,
  setDraftNote: () => { },
  resetDraft: () => { },
  setTag: () => { },
})

export default function DraftProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [state, setState] = useState<Draft>(initialState)

  const setDraftNote = (note: Note) => {
    setState((prev) => ({ note, tag: prev.tag }))
  }

  const setTag = (tag: string) => {
    setState((prev) => ({ note: prev.note, tag }))
  }

  const resetDraft = () => {
    setState(initialState)
  }

  return (
    <DraftContext.Provider value={{
      draft: state,
      resetDraft,
      setDraftNote,
      setTag
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