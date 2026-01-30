"use client";

import ListPageLoader from "@/components/list-page-loader";
import { useRecentFiles, useEditorActions } from "@/stores/editor";
// import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderSearch, FileText, Clock } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export default function ListPage() {
  const recentFiles = useRecentFiles();
  const { openByPath } = useEditorActions();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredNotes = useMemo(() => {
    const files = Object.values(recentFiles);

    const sorted = files.sort((a, b) => {
      return b.modified - a.modified;
    });

    if (!searchQuery.trim()) return sorted;

    const query = searchQuery.toLowerCase();
    return sorted.filter((note) => note.filename?.toLowerCase().includes(query));
  }, [recentFiles, searchQuery]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  if (recentFiles === null) {
    return <ListPageLoader />;
  }

  return (
    <div className="h-full relative flex flex-col text-sm bg-neutral-950">
      <div className="w-full border-b border-neutral-800 p-4">
        <h1 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Recent Files
        </h1>
        <input
          className="w-full px-3 py-2 rounded-md border border-neutral-800 outline-none text-neutral-50 bg-neutral-900 placeholder:text-neutral-600 focus:border-blue-500/50 transition-colors"
          placeholder="Search recent files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>No recent files found</p>
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              onClick={() => {
                openByPath(note.path);
                router.push("/");
              }}
              className="flex cursor-pointer justify-between items-center py-3 px-3 hover:bg-white/5 rounded-md mb-1 group transition-colors"
              key={note.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded bg-neutral-900 text-neutral-400 group-hover:text-blue-400 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-100 font-medium truncate">{note.filename}</p>
                  <p className="text-neutral-500 text-xs truncate" title={note.path}>
                    {note.path}
                  </p>
                  <p className="text-neutral-600 text-[10px] mt-0.5">{formatDate(note.modified)}</p>
                </div>
              </div>

              <motion.button
                className="h-fit p-2 cursor-pointer rounded-md border border-neutral-800 transition-all text-neutral-600 hover:text-neutral-50 hover:border-neutral-600 hover:bg-neutral-800 opacity-0 group-hover:opacity-100"
                onClick={async (e) => {
                  e.stopPropagation();
                  await invoke("plugin:opener|reveal_item_in_dir", { path: note.path });
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Reveal in file explorer"
              >
                <FolderSearch className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
