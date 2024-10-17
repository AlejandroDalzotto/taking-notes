"use client";
import MarkdownContent from "@/components/MarkdownContent";
import { getMarkdownInformation, remove } from "@/lib/markdown.service";
import { MarkdownFileInformation } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Apparently not supported.
// https://nextjs.org/docs/app/building-your-application/deploying/static-exports#unsupported-features
// export default function SingleNotePage({ params }: { params: { slug: string } }) {

//   return (
//     <div className="w-full h-full overflow-y-auto p-2 border rounded-lg border-white/5">
//       <MarkdownContent slug={params.slug} />
//     </div>
//   )
// }

const ContentWrapped = () => {
  const [markdownInformation, setMarkdownInformation] = useState<MarkdownFileInformation | null>(null)
  const searchParams = useSearchParams()
  const slug = searchParams.get("slug")!


  useEffect(() => {

    const load = async () => {
      const information = await getMarkdownInformation(slug)
      setMarkdownInformation(information)
    }
    load();
  }, [slug])

  const deleteNote = async () => {

    await remove(slug)

    // Redirect to notes page.
    window.history.back()
  }

  return (
    <>
      <header className="w-full">
        <h1 className="font-geist-mono text-lg">File title:{" "}
          {markdownInformation ? (
            <span className="text-rose-600">{markdownInformation.title}</span>
          ) : (
            <span className="text-rose-600">undefined (Not found)</span>
          )}
        </h1>
      </header>
      <section className="w-full h-full overflow-y-auto p-2 lg:px-6 lg:py-4 border rounded-lg border-white/5">
        <MarkdownContent slug={slug} />
      </section>
      <footer className="w-full flex items-center justify-between">
        <button
          onClick={deleteNote}
          className="w-8 h-8 p-1 transition-all border rounded-md hover:scale-110 border-white/5 bg-white/5"
        >
          <svg className="w-full h-full fill-neutral-50">
            <use xlinkHref="/sprites.svg#delete" />
          </svg>
        </button>
        {markdownInformation && <span className="font-geist-mono text-sm text-neutral-400">last update: {markdownInformation.updatedAt}</span>}
      </footer>
    </>
  )
}

export default function SingleNotePage() {

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <Suspense>
        <ContentWrapped />
      </Suspense>
    </div>
  )
}