"use client";
import { createContext, useContext, useState } from "react";

type NoteEditor = {
  title: string;
  content: string;
}

type EditorState = {
  noteEditorData: NoteEditor | null;
};

type EditorActions = {
  setNoteEditor: (data: NoteEditor) => void;
  setInitialNoteEditor: (data: NoteEditor) => void;
  resetNoteEditor: VoidFunction;
}

type EditorContextType = EditorState & EditorActions;

export const EditorContext = createContext<EditorContextType>({
  setNoteEditor: () => { },
  resetNoteEditor: () => { },
  setInitialNoteEditor: () => { },
  noteEditorData: null,
});

// Provider component can be implemented later to manage editor state
export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [noteEditorData, setNoteEditor] = useState<NoteEditor | null>(null);

  const setInitialNoteEditor = (initialContent: NoteEditor) => {
    setNoteEditor(initialContent);
  };

  const resetNoteEditor = () => {
    setNoteEditor(null);
  }


  return (
    <EditorContext.Provider value={{
      noteEditorData: noteEditorData,
      setNoteEditor,
      setInitialNoteEditor,
      resetNoteEditor
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