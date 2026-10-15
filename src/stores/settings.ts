import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "light" | "dark" | "cream";
export const THEMES: { id: AppTheme; label: string; color: string }[] = [
  { id: "light", label: "Light", color: "#f7f8fa" },
  { id: "dark", label: "Dark", color: "#202123" },
  { id: "cream", label: "Cream", color: "#f2ecdf" },
];
const DEFAULT_EDITOR_FONT_SIZE = 16;
const clampFontSize = (size: number) => Math.min(32, Math.max(12, size));

type State = {
  theme: AppTheme;
  editorFontSize: number;
  sidebarOpen: boolean;
  actions: {
    setTheme: (theme: AppTheme) => void;
    toggleSidebar: () => void;
    increaseEditorFontSize: (amount: number) => void;
    decreaseEditorFontSize: (amount: number) => void;
    resetFontSize: () => void;
  };
};

export const useSettingsStore = create<State>()(persist((set) => ({
  theme: "dark",
  editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
  sidebarOpen: true,
  actions: {
    setTheme: (theme) => set({ theme }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    increaseEditorFontSize: (amount) => set((state) => ({ editorFontSize: clampFontSize(state.editorFontSize + amount) })),
    decreaseEditorFontSize: (amount) => set((state) => ({ editorFontSize: clampFontSize(state.editorFontSize - amount) })),
    resetFontSize: () => set({ editorFontSize: DEFAULT_EDITOR_FONT_SIZE }),
  },
}), {
  name: "taking-notes-settings",
  version: 1,
  partialize: ({ theme, editorFontSize, sidebarOpen }) => ({ theme, editorFontSize, sidebarOpen }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<State> | null;
    return {
      ...current,
      theme: THEMES.some((theme) => theme.id === saved?.theme) ? saved!.theme! : current.theme,
      editorFontSize: typeof saved?.editorFontSize === "number" && Number.isFinite(saved.editorFontSize)
        ? clampFontSize(saved.editorFontSize) : current.editorFontSize,
      sidebarOpen: typeof saved?.sidebarOpen === "boolean" ? saved.sidebarOpen : current.sidebarOpen,
    };
  },
}));

export const useFontSize = () => useSettingsStore((state) => state.editorFontSize);
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useSidebarOpen = () => useSettingsStore((state) => state.sidebarOpen);
export const useSettingsActions = () => useSettingsStore((state) => state.actions);
