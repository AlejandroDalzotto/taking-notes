"use client";
import { createContext, useContext, useState } from "react";

type EditorState = {
  content: string;
};

type EditorActions = {
  setContent: (content: string) => void;
  setInitialContent: (content: string) => void;
}

type EditorContextType = EditorState & EditorActions;

export const EditorContext = createContext<EditorContextType>({
  setContent: () => { },
  setInitialContent: () => { },
  content: "",
});

// Provider component can be implemented later to manage editor state
export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [content, setContent] = useState<string>("");

  const setInitialContent = (initialContent: string) => {
    setContent(initialContent);
  };


  return (
    <EditorContext.Provider value={{
      content,
      setContent,
      setInitialContent,
    }}>
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