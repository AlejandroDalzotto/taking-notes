"use client";

import { useModal } from "@/context/modal-provider";
import { verifyPassword } from "@/lib/services/notes";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

interface AccessControlModalProps {
  noteId: string;
}

export default function AccessControlModal({ noteId }: AccessControlModalProps) {
  const { close } = useModal();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Please enter a password.");
      return;
    }

    setIsLoading(true);
    try {
      const isCorrect = await verifyPassword(noteId, password);

      if (isCorrect) {
        toast.success("Note unlocked!");
      } else {
        toast.error("Incorrect password.");
      }

    } catch (error) {
      console.error("Error during password verification:", error);
      toast.error("An error occurred during verification.");
    } finally {
      setIsLoading(false);
      close();
    }
  };

  const handleCancel = () => {
    toast.info("Access denied.");
    close();
  };

  return (
    <div
      className="flex flex-col w-full max-w-sm p-4 mx-auto border rounded-lg shadow-lg gap-y-4 border-white/5 bg-neutral-900"
      onClick={e => e.stopPropagation()}
    >
      <h2 className="text-xl font-bold text-center text-white">Private Note</h2>
      <p className="text-center text-neutral-300">Please enter the password to view this note.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-2 text-white border rounded-md bg-neutral-800 border-neutral-700 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 font-semibold text-white transition-colors rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Unlock Note"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 font-semibold text-white transition-colors rounded-md bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}