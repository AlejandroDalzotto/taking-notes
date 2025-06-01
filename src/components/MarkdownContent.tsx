"use client";

import Markdown from "react-markdown";
import Link from "next/link";
import { highlight } from "sugar-high";

export default function MarkdownContent({ content }: { content: string }) {

  return (
    <div className="markdown prose prose-invert prose-img:rounded-lg prose-video:rounded-lg">
      <Markdown components={{
        a(props) {
          const href = props.href ?? "#"
          const text = props.children

          return <Link
            target="_blank"
            className="text-blue-500"
            href={href}
          >
            {text}
          </Link>
        },
        code(props) {
          const { children, ...rest } = props
          const codeHTML = highlight(children?.toString() ?? "")
          return (
            <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...rest} />
          )
        }
      }}>
        {content}
      </Markdown>
    </div>
  )
}