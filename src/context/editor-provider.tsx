"use client";
import { createContext, useContext, useState } from "react";

type EditorContextType = {
  setContent: (content: string) => void;
  content: string;
};

export const EditorContext = createContext<EditorContextType>({
  setContent: () => {},
  content: "",
});

// Provider component can be implemented later to manage editor state
export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [content, setContent] = useState<string>("");

  return (
    <EditorContext.Provider value={{ content, setContent }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};