import { create } from "zustand";
import { User } from "./auth";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("bovino_user");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export const useAuthStore = create<AuthState>((set) => ({
  user:  loadUser(),
  token: typeof window !== "undefined" ? localStorage.getItem("bovino_token") : null,
  setAuth: (user, token) => {
    localStorage.setItem("bovino_token", token);
    localStorage.setItem("bovino_user", JSON.stringify(user));
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem("bovino_token");
    localStorage.removeItem("bovino_user");
    set({ user: null, token: null });
  },
}));
