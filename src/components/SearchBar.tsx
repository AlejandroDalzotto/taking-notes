"use client";

import { useSearchQueryUpdater } from "@/hooks/useSearchQueryUpdater";

export default function SearchBar() {
  const { setSearch } = useSearchQueryUpdater()

  return (
    <input
      className="w-full max-w-xl px-4 py-2 rounded-md bg-white/5 placeholder:text-white/25"
      placeholder="Search any note by title"
      onChange={(e) => setSearch(e.target.value)}
    />
  )
}
