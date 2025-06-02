"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()


  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(name, value)
    return params.toString()
  }, [searchParams])

  const updateTermHandler = async (value: string) => {

    // Update searchParams
    const queryString = createQueryString("search", value)

    // Update the URL
    router.push(pathname + "?" + queryString)
  }

  return (
    <input
      className="px-4 py-2 rounded-md bg-white/5 placeholder:text-white/15"
      placeholder="Search any note by title"
      onChange={(e) => updateTermHandler(e.target.value)}
    />
  )
}
