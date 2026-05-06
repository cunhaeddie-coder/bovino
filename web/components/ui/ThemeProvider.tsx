"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/themeStore";

export function ThemeProvider() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Aplica imediatamente no primeiro render (sem hydration flash)
  useEffect(() => {
    const saved = localStorage.getItem("bovino-theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.state?.theme) {
          document.documentElement.setAttribute("data-theme", parsed.state.theme);
        }
      } catch { /* ignora */ }
    }
  }, []);

  return null;
}
