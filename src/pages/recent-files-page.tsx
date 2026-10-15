import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { FileText, FolderOpen, FolderSearch, Plus, Search, X } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useNavigate } from "react-router";
import { useRecentFiles, useEditorActions, useIsInitialized } from "@/stores/editor";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const fullDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" });

export default function RecentFilesPage() {
  const recentFiles = useRecentFiles();
  const { openByPath, addBlank, openLocalFile } = useEditorActions();
  const isInitialized = useIsInitialized();
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return Object.values(recentFiles)
      .filter((note) => !query || note.filename.toLocaleLowerCase().includes(query) || note.path.toLocaleLowerCase().includes(query))
      .sort((a, b) => b.modified - a.modified);
  }, [recentFiles, searchQuery]);

  const runAction = async (label: string, action: () => unknown) => {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(`${label}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <motion.section
        aria-labelledby="workspace-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-12 sm:py-14"
      >
        <header className="mb-10">
          <p className="eyebrow mb-4">YOUR WORKSPACE</p>
          <h1 id="workspace-heading" className="max-w-xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
            Pick up where you left off.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">Your recent files, ready for the next thought.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="primary-button inline-flex items-center gap-2 px-4 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              onClick={() => void runAction("Unable to create note", () => {
                addBlank();
                navigate("/");
              })}
            >
              <Plus size={15} aria-hidden="true" />
              New note
            </button>
            <button
              type="button"
              className="quiet-button inline-flex items-center gap-2 px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              onClick={() => void runAction("Unable to open file", async () => {
                await openLocalFile();
                navigate("/");
              })}
            >
              <FolderOpen size={15} aria-hidden="true" />
              Open file
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="eyebrow">RECENT FILES</h2>
          <div role="search" className="relative w-full sm:w-72">
            <label htmlFor="recent-files-search" className="sr-only">Search recent filenames and paths</label>
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="recent-files-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find a file or path…"
              className="surface-input w-full rounded-lg py-2 pl-9 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              autoComplete="off"
              spellCheck={false}
              aria-controls="recent-files-list"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs text-[var(--color-danger)]">
            <p className="min-w-0 break-words leading-relaxed">{error}</p>
            <button type="button" className="icon-button shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]" aria-label="Dismiss file error" onClick={() => setError(null)}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <div id="recent-files-list" aria-busy={!isInitialized} className="border-t border-[var(--color-border)]">
          {!isInitialized ? (
            <p role="status" className="py-12 text-sm text-[var(--color-text-muted)]">Loading your workspace…</p>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg py-14 text-center">
              <FileText size={28} strokeWidth={1.25} aria-hidden="true" className="mb-4 text-[var(--color-text-muted)]" />
              <p className="text-sm">{searchQuery.trim() ? "No matching files." : "A fresh page awaits."}</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-[var(--color-text-muted)]">
                {searchQuery.trim() ? "Try another filename or a different part of the path." : "Create a note or open a local file. It will be here when you return."}
              </p>
              {searchQuery.trim() && (
                <button type="button" className="quiet-button mt-4 px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]" onClick={() => setSearchQuery("")}>Clear search</button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {filteredNotes.map((note) => {
                const date = new Date(note.modified);
                const validDate = Number.isFinite(date.getTime());
                return (
                  <li key={note.path} className="group flex items-center gap-2 py-1">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-lg px-2 py-4 text-left hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:gap-5"
                      onClick={() => void runAction(`Unable to open ${note.filename}`, async () => {
                        await openByPath(note.path);
                        navigate("/");
                      })}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]">
                        <FileText size={17} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{note.filename}</span>
                        <span className="mt-1 block truncate text-[11px] text-[var(--color-text-muted)]" title={note.path}>{note.path}</span>
                        {validDate && (
                          <time dateTime={date.toISOString()} title={fullDateFormatter.format(date)} className="mt-1.5 block text-[10px] text-[var(--color-text-secondary)] sm:hidden">
                            {dateFormatter.format(date)}
                          </time>
                        )}
                      </span>
                      {validDate && (
                        <time dateTime={date.toISOString()} title={fullDateFormatter.format(date)} className="hidden shrink-0 text-[11px] tabular-nums text-[var(--color-text-muted)] sm:block">
                          {dateFormatter.format(date)}
                        </time>
                      )}
                    </button>
                    <button
                      type="button"
                      className="icon-button mr-1 shrink-0 rounded-md p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                      aria-label={`Reveal ${note.filename} in file explorer`}
                      title="Reveal in file explorer"
                      onClick={() => void runAction(`Unable to reveal ${note.filename} in file explorer`, () => revealItemInDir(note.path))}
                    >
                      <FolderSearch size={16} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {isInitialized && filteredNotes.length > 0 && (
          <p role="status" className="mt-4 text-[10px] text-[var(--color-text-muted)]">
            {filteredNotes.length} {filteredNotes.length === 1 ? "file" : "files"}{searchQuery.trim() ? " found" : " · Stored on your device"}
          </p>
        )}
      </motion.section>
    </div>
  );
}
