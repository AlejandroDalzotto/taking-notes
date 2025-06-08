"use client";
import { FileExtension } from "@/lib/definitions";
import { createContext, useContext, useState } from "react";

type Draft = {
  data: {
    title: string,
    content: string,
  };
  tag: string | null;
  extension: FileExtension;
}

type DraftContextState = {
  draft: Draft | null;
}

type DraftContextAction = {
  setDraft: (draft: Draft) => void;
  resetDraft: VoidFunction;
}

type DraftContextType = DraftContextState & DraftContextAction

export const DraftContext = createContext<DraftContextType>({
  draft: null,
  setDraft: () => { },
  resetDraft: () => { },
})

export default function DraftProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [draft, setDraft] = useState<Draft | null>(null)

  const resetDraft = () => {
    setDraft(null)
  }

  return (
    <DraftContext.Provider value={{
      draft,
      resetDraft,
      setDraft,
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