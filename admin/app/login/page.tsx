"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      localStorage.setItem("bovino_admin_token", data.token);
      // Salva também como cookie para o middleware
      document.cookie = `bovino_admin_token=${data.token}; path=/; max-age=86400`;
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🐄</span>
          <h1 className="text-2xl font-extrabold text-white mt-2">Bovino Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Painel de gestão interno</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-mail</label>
              <input
                required type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
                placeholder="admin@bovino.com.br"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Senha</label>
              <input
                required type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition mt-2 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
