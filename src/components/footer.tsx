import { useCurrentTabMeta, useCurrentFileInfo, useIsInitialized } from "@/stores/editor";

/**
 * Format a byte count into a human-readable string.
 * e.g. 0 → "0 B", 1023 → "1023 B", 1024 → "1.0 KB", 1048576 → "1.0 MB"
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FooterCell({ children }: { children: React.ReactNode }) {
  return <span className="border-l border-neutral-800 pl-2 pr-4 text-xs text-neutral-400 whitespace-nowrap">{children}</span>;
}

export default function Footer() {
  const currentTab = useCurrentTabMeta();
  const fileInfo = useCurrentFileInfo();
  const isInitialized = useIsInitialized();

  return (
    <footer className="row-span-3 flex bg-neutral-950 text-sm text-neutral-200 ring-1 ring-neutral-800 justify-between items-center px-2 py-1.5 relative select-none">
      {/* Left side — file metadata */}
      <div className="flex items-center gap-0 overflow-hidden">
        {!isInitialized ? (
          <span className="text-xs text-neutral-500">Initializing...</span>
        ) : currentTab && fileInfo ? (
          <>
            {currentTab.isDirty && (
              <FooterCell>
                <span className="text-blue-400">Modified</span>
              </FooterCell>
            )}

            {fileInfo.extension && <FooterCell>.{fileInfo.extension}</FooterCell>}

            <FooterCell>{fileInfo.lineEnding === "N/A" ? "—" : fileInfo.lineEnding}</FooterCell>

            <FooterCell>{fileInfo.encoding}</FooterCell>

            <FooterCell>{formatFileSize(fileInfo.fileSize)}</FooterCell>
          </>
        ) : currentTab ? (
          // Tab open but no file info yet (edge case during load)
          <span className="text-xs text-neutral-500">Loading...</span>
        ) : (
          // No tab open at all
          <span className="text-xs text-neutral-600">No file open</span>
        )}
      </div>

      {/* Right side — app version */}
      <div className="flex items-center shrink-0">
        <FooterCell>v1.2.1</FooterCell>
      </div>
    </footer>
  );
}
