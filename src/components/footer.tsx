"use client";

import { useCurrent, useIsInitialized } from "@/stores/editor";
export default function Footer() {
  const current = useCurrent();
  const isInitialized = useIsInitialized();

  let statusText = "";
  if (!isInitialized) {
    statusText = "Initializing...";
  } else if (current?.isDirty) {
    statusText = "Modified";
  }

  return (
    <footer className="row-span-3 flex bg-neutral-950 text-sm text-neutral-200 ring-1 ring-neutral-800 justify-between items-center p-2 relative">
      {current ? (
        <div className="grid grid-cols-4 grow gap-x-4 max-w-xl *:border-l *:border-neutral-800 *:pr-10 *:pl-2">
          {/*<CursorInfo />*/}
          {/*<WordsInfo />*/}
          {/*<CharactersInfo />*/}
          {statusText && <span className="text-blue-400 text-xs">{statusText}</span>}
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-x-4 *:border-l *:border-neutral-800 *:pr-10 *:pl-2">
        <p>v1.0.0</p>
      </div>
    </footer>
  );
}
