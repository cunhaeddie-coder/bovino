"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

export function AuthHydrator() {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) return;

    // Sempre atualiza o user do servidor para garantir papel, permissões atualizadas
    getMe()
      .then((me) => setAuth(me, token))
      .catch(() => clearAuth());
  }, []);

  return null;
}
