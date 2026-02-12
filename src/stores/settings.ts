import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

enum AppTheme {
  LIGHT = "light",
  DARK = "dark",
}

const DEFAULT_THEME = AppTheme.DARK;
const DEFAULT_EDITOR_FONT_SIZE = 16;

type State = {
  theme: AppTheme;
  editorFontSize: number;
  actions: {
    loadSettings: () => Promise<void>;
    setTheme: (theme: AppTheme) => void;
    increaseEditorFontSize: (fontSize: number) => void;
    decreaseEditorFontSize: (fontSize: number) => void;
    resetFontSize: () => void;
  };
};

const useSettingsStore = create<State>()((set) => ({
  theme: DEFAULT_THEME,
  editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
  actions: {
    loadSettings: async () => {
      // Load settings from local storage or API
      const settings = await invoke<{ theme: AppTheme; fontSize: number }>("get_settings");
      set({ theme: settings.theme ?? DEFAULT_THEME, editorFontSize: settings.fontSize ?? DEFAULT_EDITOR_FONT_SIZE });
    },
    setTheme: (theme) => set({ theme }),
    increaseEditorFontSize: (fontSize) => set((state) => ({ editorFontSize: state.editorFontSize + fontSize })),
    decreaseEditorFontSize: (fontSize) => set((state) => ({ editorFontSize: state.editorFontSize - fontSize })),
    resetFontSize: () => set({ editorFontSize: DEFAULT_EDITOR_FONT_SIZE }),
  },
}));

export const useFontSize = () => useSettingsStore((state) => state.editorFontSize);
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useSettingsActions = () => useSettingsStore((state) => state.actions);
