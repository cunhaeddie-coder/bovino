"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { getMe, getToken } from "@/lib/auth";

function AuthHydrator() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (user) return; // já hidratado

    const token = getToken();
    if (!token) return;

    getMe()
      .then((u) => setAuth(u, token))
      .catch(() => clearAuth());
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator />
      {children}
    </QueryClientProvider>
  );
}
