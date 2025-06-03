"use client";

import { useModal } from "@/context/modal-provider";

const Text = () => {
  return (
    <div className="flex flex-col text-center items-center justify-center gap-2 font-mono text-white/20 text-base lg:text-2xl pointer-events-none">
      <span>click anywhere</span>
      <span>to close</span>
    </div>
  );
}

export default function ModalPlaceholder({ children }: { children: React.ReactNode }) {

  const { close } = useModal();

  return (
    <div onClick={close} className="fixed inset-0 flex items-center justify-around bg-black/50 backdrop-blur-xs z-50">
      <Text />
      <div className="z-[60]">
        {children}
      </div>
      <Text />
    </div>
  );
}