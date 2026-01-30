"use client";

import { useEditorActions } from "@/stores/editor";

export default function Welcome() {
  const { addBlank, openLocalFile } = useEditorActions();

  const handleOpenFile = async () => {
    openLocalFile();
  };

  const handleCreateNote = () => {
    addBlank();
  };

  return (
    <section className="h-full gap-y-4 flex flex-col justify-center items-center text-neutral-200">
      <header>
        <h1 className="text-3xl">Welcome home!</h1>
      </header>
      <section>
        <p>Please open a file or drag and drop it here to start editing.</p>
      </section>
      <div className="flex items-center gap-x-4 text-sm">
        <button onClick={handleOpenFile} className="cursor-pointer font-light transition-colors hover:text-blue-500">
          Open a file
        </button>
        <p>or</p>
        <button onClick={handleCreateNote} className="cursor-pointer font-light transition-colors hover:text-blue-500">
          Create a new note
        </button>
      </div>
    </section>
  );
}
