"use client";

import { useModal } from "@/context/modal-provider";
import { savePassword } from "@/lib/services/notes";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

export default function AccessControlPasswordModal({ noteId }: { noteId: string }) {
  const { close } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");

  const handler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Password cannot be empty.");
      return;
    }

    setIsLoading(true);
    const result = await savePassword(noteId, password);
    setIsLoading(false);

    if (!result) {
      toast.error('Error trying to set password.');
      return;
    }

    toast.success('Password set successfully.');
    close(); // Close the modal on success
  };

  return (
    <div className="flex flex-col gap-y-4" onClick={e => e.stopPropagation()}>
      <div className="max-w-xl w-full max-h-[calc(100vh-100px)] relative bg-neutral-900 overflow-y-auto p-4 border rounded-lg border-white/5">
        <h2 className="mb-4 text-lg font-bold text-white">Set Note Password</h2>
        <form onSubmit={handler} className="flex flex-col gap-y-3">
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            className="px-3 py-2 text-white border rounded-md bg-neutral-800 border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 text-white transition-colors bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Password"}
          </button>
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-white transition-colors rounded-md bg-neutral-700 hover:bg-neutral-600"
            disabled={isLoading}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}