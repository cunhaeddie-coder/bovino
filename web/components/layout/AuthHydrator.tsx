"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";
import { api } from "@/lib/api";

export function AuthHydrator() {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) return;

    getMe()
      .then((me) => setAuth(me, token))
      .catch(() => clearAuth());
  }, []);

  // Heartbeat: atualiza last_seen_at a cada 60s enquanto logado
  useEffect(() => {
    if (!token) return;
    const ping = () => api.post("/ping").catch(() => {});
    ping();
    const iv = setInterval(ping, 60_000);
    return () => clearInterval(iv);
  }, [token]);

  return null;
}
