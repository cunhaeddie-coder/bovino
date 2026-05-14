import { create } from "zustand";
import { User } from "./auth";

interface AuthState {
  user: User | null;
  token: string | null;
  activeFazendaId: number | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setActiveFazendaId: (id: number) => void;
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("bovino_user");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function loadFazendaId(): number | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("bovino_fazenda_id");
  return s ? parseInt(s) : null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            loadUser(),
  token:           typeof window !== "undefined" ? localStorage.getItem("bovino_token") : null,
  activeFazendaId: loadFazendaId(),
  setAuth: (user, token) => {
    localStorage.setItem("bovino_token", token);
    localStorage.setItem("bovino_user", JSON.stringify(user));
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem("bovino_token");
    localStorage.removeItem("bovino_user");
    localStorage.removeItem("bovino_fazenda_id");
    set({ user: null, token: null, activeFazendaId: null });
  },
  setActiveFazendaId: (id) => {
    localStorage.setItem("bovino_fazenda_id", String(id));
    set({ activeFazendaId: id });
  },
}));
