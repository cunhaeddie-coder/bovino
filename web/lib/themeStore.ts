import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "verde" | "azul" | "terracota" | "terra";

export const THEMES: { id: ThemeId; label: string; cor: string }[] = [
  { id: "verde",     label: "Verde",     cor: "#15803d" },
  { id: "azul",      label: "Azul",      cor: "#1d4ed8" },
  { id: "terracota", label: "Terracota", cor: "#c2410c" },
  { id: "terra",     label: "Terra",     cor: "#44403c" },
];

interface ThemeStore {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "verde",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "bovino-theme" }
  )
);
