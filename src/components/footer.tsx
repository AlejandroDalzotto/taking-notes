import { useCurrentTabMeta, useIsInitialized } from "@/stores/editor";
export default function Footer() {
  const currentTab = useCurrentTabMeta();
  const isInitialized = useIsInitialized();

  let statusText = "";
  if (!isInitialized) {
    statusText = "Initializing...";
  } else if (currentTab?.isDirty) {
    statusText = "Modified";
  }

  return (
    <footer className="row-span-3 flex bg-neutral-950 text-sm text-neutral-200 ring-1 ring-neutral-800 justify-between items-center p-2 relative">
      {currentTab ? (
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
        <p>v0.0.1 (dev)</p>
      </div>
    </footer>
  );
}
