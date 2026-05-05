import { create } from "zustand";
import { User } from "./auth";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("bovino_token") : null,
  setAuth: (user, token) => {
    localStorage.setItem("bovino_token", token);
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem("bovino_token");
    set({ user: null, token: null });
  },
}));
