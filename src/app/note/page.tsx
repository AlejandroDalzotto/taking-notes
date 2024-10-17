"use client";
import MarkdownContent from "@/components/MarkdownContent";
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

  if (!slug || typeof slug !== "string") {
    return window.history.back()
  }

  return (
    <div className="w-full h-full overflow-y-auto p-2 lg:px-6 lg:py-4 border rounded-lg border-white/5">
      <MarkdownContent slug={slug} />
    </div>
  )
}