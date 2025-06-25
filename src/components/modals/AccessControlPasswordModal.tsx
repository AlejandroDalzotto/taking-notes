"use client";

import type { MouseEvent } from "react";

export default function AccessControlPasswordModal({ noteId }: { noteId: string }) {

  const handler = async (e: MouseEvent<HTMLDivElement, MouseEvent>) => {

  }
  return (
    <div className="flex flex-col gap-y-4" onClick={e => e.stopPropagation()}>
      <div className="max-w-xl w-full max-h-[calc(100vh-100px)] relative bg-neutral-900 overflow-y-auto p-4 border rounded-lg border-white/5">
        <form>
          <input type="password" name="password" />
          <button type="submit">save password</button>
        </form>
      </div>
    </div>
  );
}