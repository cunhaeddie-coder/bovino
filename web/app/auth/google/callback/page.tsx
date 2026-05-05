"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Entrando com Google...</p>
      </div>
    </div>
  );
}

function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      router.replace("/login?error=google_falhou");
      return;
    }

    api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        setAuth(data, token);
        router.replace("/");
      })
      .catch(() => {
        router.replace("/login?error=google_falhou");
      });
  }, []);

  return <Spinner />;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <GoogleCallback />
    </Suspense>
  );
}
