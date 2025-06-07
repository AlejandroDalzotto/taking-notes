"use client";

import { useDraft } from "@/context/draft-provider";
import { FileExtension } from "@/lib/definitions"
import clsx from "clsx"
import Link from "next/link"

type NoteOption = {
  label: string,
  symbol: FileExtension,
  url: string,
}

export default function CreateNotePage() {

  const { draft, extension, tag, resetDraft } = useDraft()

  const options: NoteOption[] = [
    {
      label: "Markdown-based note",
      symbol: FileExtension.MARKDOWN,
      url: "/editor/create/md",
    },
    {
      label: "Text plain note",
      symbol: FileExtension.PLAINTEXT,
      url: "/editor/create/txt",
    }
  ]

  return (
    <div className="flex flex-col items-center justify-center gap-10 grow place-content-center">
      <h2 className="text-3xl font-light text-center text-neutral-300 font-geist-mono">What do you want to create today?</h2>
      <div className="flex flex-wrap gap-10">
        {
          options.map(option => {

            return (
              <Link
                onClick={() => resetDraft()}
                href={option.url}
                title={`Create a ${option.label.toLowerCase()}`}
                className={clsx(
                  "relative transition-colors group flex flex-col items-center justify-end w-56 p-4 border-2 rounded-lg font-geist-mono text-neutral-600 border-neutral-600 aspect-square",
                  { "hover:border-neutral-300 hover:bg-neutral-300/10": option.symbol === FileExtension.PLAINTEXT },
                  { "hover:border-blue-500 hover:bg-blue-500/10": option.symbol === FileExtension.MARKDOWN },
                )}
                key={option.symbol}
              >
                <p className={clsx(
                  "absolute transition-colors font-light -translate-x-1/2 -translate-y-1/2 text-7xl top-1/2 left-1/2",
                  { "group-hover:text-neutral-300": option.symbol === FileExtension.PLAINTEXT },
                  { "group-hover:text-blue-500": option.symbol === FileExtension.MARKDOWN },
                )}>{".".concat(option.symbol)}</p>
                <p className={clsx(
                  "text-lg transition-colors font-bold truncate whitespace-nowrap",
                  { "group-hover:text-neutral-300": option.symbol === FileExtension.PLAINTEXT },
                  { "group-hover:text-blue-500": option.symbol === FileExtension.MARKDOWN },
                )}>{option.label}</p>
              </Link>
            )

          })
        }
      </div>
      {draft ? (
        <Link
          href={tag ? `/editor/edit/${extension}?tag=${tag}` : `/editor/create/${extension}`}
          className="px-4 py-2 text-lg text-center transition-colors border-2 rounded-md w-max border-neutral-600 text-neutral-600 hover:border-neutral-300 hover:text-neutral-300 font-geist-mono"
        >
          You have an unsaved draft. <br /> Would you like to continue editing it?
        </Link>
      ) : null}
    </div>
  )
}
