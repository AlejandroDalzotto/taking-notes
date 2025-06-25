"use client";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useState } from "react";

type ModalContextType = {
  open: (content: React.ReactNode) => void;
  close: () => void;
};

export const ModalContext = createContext<ModalContextType>({
  open: () => { },
  close: () => { },
});

// Provider component can be implemented later to manage modal state
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const open = (content: React.ReactNode) => {
    setModalContent(content);
  };

  const close = () => {
    setModalContent(null);
  };

  const isOpen = Boolean(modalContent)

  return (
    <ModalContext.Provider value={{ open, close }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Prevent modal content from closing modal
            >
              {modalContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </ModalContext.Provider>
  );
}

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}