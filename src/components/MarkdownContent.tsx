"use client";

import { getMarkdown } from "@/lib/markdown.service"
import { Suspense, useEffect, useState } from "react";
import Loading from "@/components/Loading";
import Markdown from "react-markdown";

export default function MarkdownContent({ slug }: { slug: string }) {

  const [content, setContent] = useState("")

  useEffect(() => {
    const load = async () => {
      const markdownContent = await getMarkdown(slug)
      setContent(markdownContent)
    }
    load();
  }, [slug])


  return (
    <Suspense fallback={<Loading />}>
      <Markdown className="markdown prose prose-invert prose-img:rounded-lg prose-video:rounded-lg">
        {content}
      </Markdown>
    </Suspense>
  )
}