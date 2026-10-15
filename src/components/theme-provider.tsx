import { useLayoutEffect } from "react";
import { useTheme } from "@/stores/settings";

export default function ThemeProvider() {
  const theme = useTheme();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  }, [theme]);

  return null;
}
