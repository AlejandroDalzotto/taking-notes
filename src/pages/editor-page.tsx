import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, FolderOpen, Plus, Save } from "lucide-react";
import { useActiveContent, useCurrentTabMeta, useCurrentFileInfo, useEditorActions, useIsInitialized } from "@/stores/editor";
import { useFontSize } from "@/stores/settings";

function EmptyWorkspace() {
  const reducedMotion = useReducedMotion();
  const { addBlank, openLocalFile } = useEditorActions();
  const initialized = useIsInitialized();

  return (
    <div className="custom-scrollbar flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto bg-surface px-6 py-8 text-ink">
      <motion.div className="my-auto flex w-full max-w-xl flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.4 }}>
        <div className="paper-art" aria-hidden="true">
          <span className="paper-outline paper-back" />
          <span className="paper-outline paper-front"><i /><i /><i /><i /><span>tn.</span></span>
          <span className="art-cross art-cross-one">+</span><span className="art-cross art-cross-two">+</span>
          <span className="art-caption">A SPACE FOR WHAT COMES NEXT</span>
        </div>
        <p className="eyebrow mb-4 mt-5">LESS NOISE. MORE THOUGHT.</p>
        <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">A little room<br />to think<span className="text-accent">.</span></h1>
        <p className="mt-5 text-[13px] leading-7 text-secondary">A passing thought, a fresh idea, a list for tomorrow.<br />Start here. Make it yours.</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button className="primary-button" disabled={!initialized} onClick={addBlank}><Plus size={16} />New note<ArrowUpRight size={14} /></button>
          <button className="quiet-button" disabled={!initialized} onClick={() => void openLocalFile()}><FolderOpen size={16} />Open a file</button>
        </div>
        <p className="mt-5 text-[10px] leading-5 text-muted">{initialized ? "Or drop a text file anywhere in this window" : "Restoring your workspace…"}</p>
      </motion.div>
    </div>
  );
}

export default function EditorPage() {
  const currentTab = useCurrentTabMeta();
  const activeContent = useActiveContent();
  const fileInfo = useCurrentFileInfo();
  const { setContent, saveCurrentFileOnDisk } = useEditorActions();
  const fontSize = useFontSize();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ line: 1, column: 1 });

  useEffect(() => {
    setPosition({ line: 1, column: 1 });
    textarea.current?.focus();
  }, [currentTab?.id]);

  if (!currentTab) return <EmptyWorkspace />;

  const updatePosition = (element: HTMLTextAreaElement) => {
    const preceding = element.value.slice(0, element.selectionStart);
    const lastBreak = preceding.lastIndexOf("\n");
    setPosition({ line: preceding.split("\n").length, column: preceding.length - lastBreak });
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-surface text-ink" aria-label="Note editor">
      <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-4 px-6 pb-6 pt-8 sm:px-12 sm:pt-10 lg:px-16">
        <div className="min-w-0">
          <p className="eyebrow mb-3">{currentTab.path ? "ON YOUR DEVICE" : "A WORK IN PROGRESS"}</p>
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight sm:text-3xl" title={currentTab.path}>{currentTab.filename === "untitled" ? "Untitled note" : currentTab.filename}</h1>
        </div>
        <button className="quiet-button shrink-0" onClick={() => void saveCurrentFileOnDisk()} title="Save to file (Ctrl+S)"><Save size={14} /><span>Save</span></button>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 px-6 pb-5 sm:px-12 lg:px-16">
        <textarea
          key={currentTab.id}
          ref={textarea}
          className="custom-scrollbar h-full min-h-0 w-full resize-none rounded-sm border-0 bg-transparent py-2 pr-3 font-mono leading-[1.9] text-ink caret-accent outline-none placeholder:text-muted/70 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent/40"
          aria-label={`Edit ${currentTab.filename}`}
          placeholder="Let your thoughts find a place…"
          style={{ fontSize }}
          value={activeContent.replace(/\r\n/g, "\n")}
          onChange={(event) => {
            const value = event.target.value;
            // Textareas normalize line endings; preserve a Windows document's format.
            setContent(fileInfo?.lineEnding === "CRLF" ? value.replace(/\r?\n/g, "\r\n") : value);
            updatePosition(event.target);
          }}
          onSelect={(event) => updatePosition(event.currentTarget)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div className="flex h-8 shrink-0 items-center justify-between gap-4 px-6 font-mono text-[9px] text-muted sm:px-12 lg:px-16 [&>span:first-child]:min-w-0 [&>span:first-child]:truncate [&>span:last-child]:shrink-0 [&>span:last-child]:whitespace-nowrap"><span title={currentTab.path}>{currentTab.path ?? "Unsaved file · Your draft stays in this local session"}</span><span>Ln {position.line}, Col {position.column}</span></div>
    </section>
  );
}
