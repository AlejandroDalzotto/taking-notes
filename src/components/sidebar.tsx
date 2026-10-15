import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Clock3, FileText, FolderOpen, Plus, X, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useEditorActions, useTabsMeta, useIsActiveTab, useIsInitialized } from "@/stores/editor";
import { THEMES, useSettingsActions, useSidebarOpen, useTheme } from "@/stores/settings";
import { TabMeta } from "@/lib/types";

const DocumentItem = memo(function DocumentItem({ tab }: { tab: TabMeta }) {
  const { openTab, closeTab } = useEditorActions();
  const active = useIsActiveTab(tab.id);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selected = active && pathname === "/";

  return (
    <div className={`group flex items-center rounded-md border transition-colors ${selected ? "border-line bg-elevated text-ink" : "border-transparent text-secondary hover:bg-elevated/60 hover:text-ink"}`}
      onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); void closeTab(tab.id); } }}>
      <button className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md pl-3 pr-1 text-left text-xs [&>svg]:shrink-0 [&>svg]:text-muted" aria-current={selected ? "page" : undefined}
        title={tab.path ?? "Unsaved note — kept in your local session"}
        onClick={() => { void openTab(tab.id); navigate("/"); }}>
        <FileText size={15} strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{tab.filename === "untitled" ? "Untitled note" : tab.filename}</span>
        {tab.isDirty && <span className="size-1 shrink-0 rounded-full bg-accent" role="img" aria-label="Unsaved changes" />}
      </button>
      <button className="mr-1 flex size-7 shrink-0 items-center justify-center rounded text-muted opacity-0 transition-[opacity,color,background-color] hover:bg-surface hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100" onClick={() => void closeTab(tab.id)} aria-label={`Close ${tab.filename}`} title="Close note"><X size={13} /></button>
    </div>
  );
});

export default function Sidebar() {
  const reducedMotion = useReducedMotion();
  const tabs = useTabsMeta();
  const isOpen = useSidebarOpen();
  const initialized = useIsInitialized();
  const theme = useTheme();
  const { setTheme } = useSettingsActions();
  const { addBlank, openLocalFile } = useEditorActions();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside id="notes-sidebar" className="h-full min-h-0 shrink-0 overflow-hidden border-r border-line bg-sidebar text-ink" aria-label="Notes sidebar"
          initial={{ width: 0, opacity: 0 }} animate={{ width: 248, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex h-full min-h-0 w-[248px] flex-col">
            <div className="flex shrink-0 flex-col gap-1 px-4 pb-6 pt-5">
              <button className="mb-2 flex h-10 w-full items-center gap-2.5 rounded-md border border-line bg-elevated px-3 text-xs font-medium text-ink transition-colors hover:border-accent/40 hover:bg-surface" disabled={!initialized} onClick={() => { addBlank(); navigate("/"); }}>
                <Plus size={16} /><span>New note</span><kbd className="ml-auto whitespace-nowrap font-mono text-[9px] font-normal text-muted">Ctrl N</kbd>
              </button>
              <button className="flex h-9 items-center gap-2.5 rounded-md px-3 text-left text-xs text-secondary transition-colors hover:bg-elevated hover:text-ink [&>span]:flex-1 [&>svg:last-child]:text-muted" disabled={!initialized} onClick={() => { void openLocalFile(); navigate("/"); }}><FolderOpen size={16} /><span>Open a file</span><ArrowUpRight size={13} /></button>
              <button className={`flex h-9 items-center gap-2.5 rounded-md px-3 text-left text-xs transition-colors ${pathname === "/recent-files" ? "bg-elevated text-ink" : "text-secondary hover:bg-elevated hover:text-ink"}`}
                onClick={() => navigate("/recent-files")} aria-current={pathname === "/recent-files" ? "page" : undefined}>
                <Clock3 size={16} /><span>Recent files</span>
              </button>
            </div>
            <div className="flex shrink-0 items-center justify-between px-7 pb-3"><span className="eyebrow">OPEN NOTES</span><span className="font-mono text-[9px] tabular-nums text-muted">{String(tabs.length).padStart(2, "0")}</span></div>
            <nav className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4" aria-label="Open notes">
              {tabs.map((tab) => <DocumentItem key={tab.id} tab={tab} />)}
              {tabs.length === 0 && <p className="whitespace-pre-line px-3 py-5 text-[11px] leading-6 text-muted">{initialized ? "A clean slate.\nMake something of it." : "Restoring your workspace…"}</p>}
            </nav>
            <div className="shrink-0 border-t border-line px-6 pb-5 pt-5">
              <fieldset className="min-w-0">
                <legend className="eyebrow">APPEARANCE</legend>
                <div className="mt-3 flex gap-1">
                  {THEMES.map((option) => (
                    <label className={`relative flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2 rounded-md border px-1 py-2 text-[9px] transition-colors hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${theme === option.id ? "border-accent/45 bg-elevated text-ink" : "border-transparent text-muted hover:bg-elevated/60"}`} key={option.id}>
                      <input className="sr-only" type="radio" name="app-theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} />
                      <span className="size-4 rounded-full border border-line shadow-sm" style={{ background: option.color }} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 flex items-center gap-1.5 whitespace-nowrap text-[9px] text-muted [&>span:last-child]:ml-auto"><span className="size-1 shrink-0 rounded-full bg-accent" />Just you & your words.<span>All local.</span></div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
