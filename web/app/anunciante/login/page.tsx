"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AnuncianteLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/anunciante/login", { email, password });
      localStorage.setItem("bovino_anunciante_token", data.token);
      router.push("/anunciante/painel");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao entrar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-2xl font-extrabold text-green-700">Bovino</Link>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600 text-sm font-medium">Painel do Anunciante</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Entrar</h1>
          <p className="text-gray-500 text-sm mb-7">Acesse o painel da sua empresa.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
              <input
                required
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                placeholder="Sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-8 text-gray-400 text-sm"
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-full transition disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-xs text-gray-500">
              Não tem conta?{" "}
              <Link href="/anunciante/cadastro" className="text-green-600 font-semibold hover:underline">
                Cadastrar empresa
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
