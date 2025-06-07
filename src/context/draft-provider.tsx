"use client";
import { FileExtension } from "@/lib/definitions";
import { createContext, useContext, useState } from "react";

type DraftContextState = {
  draft: string;
  tag: string | null;
  extension: FileExtension | null;
}

type DraftContextAction = {
  setDraft: (value: string, fileExtension: FileExtension) => void;
  setTag: (value: string) => void;
  resetDraft: VoidFunction;
}

type DraftContextType = DraftContextState & DraftContextAction

export const DraftContext = createContext<DraftContextType>({
  draft: "",
  tag: null,
  extension: null,
  setDraft: () => { },
  setTag: () => { },
  resetDraft: () => { },
})

export default function DraftProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [draft, setDraft] = useState("")
  const [tag, setTag] = useState<string | null>(null)
  const [extension, setExtension] = useState<FileExtension | null>(null)

  const resetDraft = () => {
    setDraft("")
    setTag(null)
    setExtension(null)
  }

  const set = (value: string, fileExtension: FileExtension) => {
    setDraft(value)
    setExtension(fileExtension)
  }

  return (
    <DraftContext.Provider value={{
      draft,
      tag,
      extension,
      resetDraft,
      setDraft: set,
      setTag,
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