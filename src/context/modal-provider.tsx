"use client";
import ModalPlaceholder from "@/components/ModalPlaceholder";
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
  const [modalVisible, setModalVisible] = useState(false);

  const open = (content: React.ReactNode) => {
    setModalContent(content);
    setModalVisible(true);
  };

  const close = () => {
    setModalVisible(false);
    setModalContent(null);
  };

  return (
    <ModalContext.Provider value={{ open, close }}>
      {modalVisible && modalContent && (
        <ModalPlaceholder>
          {modalContent}
        </ModalPlaceholder>
      )}
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