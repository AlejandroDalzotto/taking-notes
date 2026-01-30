"use client";

import Editor from "@/components/editor";
import Welcome from "@/components/welcome";
import { useCurrent } from "@/stores/editor";

export default function Home() {
  const current = useCurrent();

  if (!current) {
    return <Welcome />;
  }

  return <Editor />;
}
