import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useActiveContent, useCurrentTabMeta, useCurrentFileInfo, useIsInitialized } from "@/stores/editor";

export default function Footer() {
  const currentTab = useCurrentTabMeta();
  const fileInfo = useCurrentFileInfo();
  const initialized = useIsInitialized();
  const content = useDeferredValue(useActiveContent());
  const [version, setVersion] = useState<string | null>(null);
  const stats = useMemo(
    () => ({
      words: content.match(/\S+/g)?.length ?? 0,
      characters: content.length - (content.match(/\r\n/g)?.length ?? 0),
    }),
    [content],
  );

  useEffect(() => {
    void getVersion().then(setVersion).catch(console.error);
  }, []);

  return (
    <footer className="flex h-8 shrink-0 select-none items-center justify-between gap-3 border-t border-line bg-surface px-4 text-[10px] text-muted">
      <div className="flex min-w-0 items-center gap-2 [&>span:last-child]:truncate">
        <span className="size-1 shrink-0 rounded-full bg-accent" />
        <span>
          {!initialized
            ? "Opening your workspace"
            : currentTab?.isDirty
              ? "Unsaved changes"
              : currentTab
                ? currentTab.path
                  ? "Saved to file"
                  : "Local draft"
                : "Local-first. Always yours."}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap font-mono text-[9px] tabular-nums sm:gap-4">
        {currentTab && (
          <>
            <span>
              {stats.words.toLocaleString()} {stats.words === 1 ? "word" : "words"}
            </span>
            <span className="hidden md:inline">{stats.characters.toLocaleString()} characters</span>
            <span>{fileInfo?.encoding ?? "UTF-8"}</span>
            {fileInfo && fileInfo.lineEnding !== "N/A" && <span>{fileInfo.lineEnding}</span>}
          </>
        )}
        {version && <span className="hidden border-l border-line pl-3 text-muted/70 sm:inline sm:pl-4">v{version}</span>}
      </div>
    </footer>
  );
}
