"use client";
import MarkdownContent from "@/components/MarkdownContent";
import { remove } from "@/lib/markdown.service";
import { useSearchParams } from "next/navigation";

// Apparently not supported.
// https://nextjs.org/docs/app/building-your-application/deploying/static-exports#unsupported-features
// export default function SingleNotePage({ params }: { params: { slug: string } }) {

//   return (
//     <div className="w-full h-full overflow-y-auto p-2 border rounded-lg border-white/5">
//       <MarkdownContent slug={params.slug} />
//     </div>
//   )
// }

export default function SingleNotePage() {

  const searchParams = useSearchParams()
  const slug = searchParams.get("slug")

  const deleteNote = async (slug: string) => {

    await remove(slug)

    // Redirect to notes page.
    window.history.back()
  }

  return (
    <div className="w-full h-full flex flex-col p-1 gap-y-2">
      <section className="w-full h-full overflow-y-auto p-2 lg:px-6 lg:py-4 border rounded-lg border-white/5">
        <MarkdownContent slug={slug!} />
      </section>
      <footer className="w-full flex items-center justify-between">
        <button
          onClick={() => deleteNote(slug!)}
          className="w-8 h-8 p-1 bg-red-400 transition-all border rounded-md opacity-0 hover:scale-110 bottom-2 right-2 border-white/5 bg-white/5 group-hover/card:opacity-100"
        >
          <svg className="w-full h-full fill-neutral-50">
            <use xlinkHref="/sprites.svg#delete" />
          </svg>
        </button>
      </footer>
    </div>
  )
}