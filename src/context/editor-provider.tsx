"use client";
import { createContext, useContext, useState } from "react";

type EditorContextType = {
  setContent: (content: string) => void;
  content: string;
  setInitialContent: (content: string) => void;
};

export const EditorContext = createContext<EditorContextType>({
  setContent: () => { },
  content: "",
  setInitialContent: () => { },
});

// Provider component can be implemented later to manage editor state
export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [content, setContent] = useState<string>("");

  const setInitialContent = (initialContent: string) => {
    setContent(initialContent);
  };

  return (
    <EditorContext.Provider value={{ content, setContent, setInitialContent }}>
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