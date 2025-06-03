"use client";

import { useModal } from "@/context/modal-provider";

const Text = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 font-mono text-white/10 text-2xl pointer-events-none">
      <span className="text">click anywhere</span>
      <span>to close</span>
    </div>
  );
}

export default function ModalPlaceholder({ children }: { children: React.ReactNode }) {

  const { close } = useModal();

  return (
    <div onClick={close} className="fixed inset-0 flex items-center justify-around bg-black/50 backdrop-blur-xs z-50">
      <Text />
      <div className="z-60">
        {children}
      </div>
      <Text />
    </div>
  );
}