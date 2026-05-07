"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Modo: 'senha' (gestor) ou 'otp' (vaqueiro)
  const [modo, setModo] = useState<"senha" | "otp">("senha");

  // Login com senha
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Login com OTP (vaqueiro)
  const [celularOtp, setCelularOtp] = useState("");
  const [codigo, setCodigo] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoginSenha(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const isEmail = login.includes("@");
      const payload = isEmail
        ? { email: login, password }
        : { celular: login.replace(/\D/g, ""), password };
      const { data } = await api.post("/auth/login", payload);
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Erro ao fazer login.");
    } finally { setLoading(false); }
  }

  async function handleLoginOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login-otp", {
        celular: celularOtp.replace(/\D/g, ""),
        codigo,
      });
      setAuth(data.user, data.token);
      router.push("/gestao/curral");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Código inválido ou expirado.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <Link href="/" className="text-2xl font-bold text-green-700 mb-8">🐄 Bovino</Link>

      {/* Alternador Gestor / Vaqueiro */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-6 w-full max-w-sm">
        <button
          onClick={() => { setModo("senha"); setError(""); }}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${modo === "senha" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
        >
          Gestor / Produtor
        </button>
        <button
          onClick={() => { setModo("otp"); setError(""); }}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${modo === "otp" ? "bg-white shadow text-amber-700" : "text-gray-500"}`}
        >
          🤠 Vaqueiro
        </button>
      </div>

      {modo === "senha" ? (
        <form onSubmit={handleLoginSenha} noValidate className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Entrar na conta</h1>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular ou E-mail</label>
            <input
              type="text" value={login} onChange={(e) => setLogin(e.target.value)}
              placeholder="(65) 99999-9999 ou email@exemplo.com"
              required autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg py-2.5 font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors">
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">ou continue com</span></div>
          </div>

          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/auth/google`}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </a>

          <p className="text-center text-sm text-gray-500">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-green-700 font-medium hover:underline">Cadastre-se</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleLoginOtp} noValidate className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-4">
          <div className="text-center mb-2">
            <p className="text-3xl mb-1">🤠</p>
            <h1 className="text-xl font-bold text-gray-900">Acesso Vaqueiro</h1>
            <p className="text-sm text-gray-500 mt-1">Entre com o código enviado pelo seu gestor</p>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu celular (WhatsApp)</label>
            <input
              type="tel" value={celularOtp} onChange={(e) => setCelularOtp(e.target.value)}
              placeholder="(69) 99999-9999" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de acesso (6 dígitos)</label>
            <input
              type="text" value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" required maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-[0.5em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">Código enviado pelo gestor da fazenda via WhatsApp</p>
          </div>

          <button type="submit" disabled={loading || codigo.length !== 6}
            className="w-full bg-amber-600 text-white rounded-lg py-2.5 font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors">
            {loading ? "Verificando..." : "Entrar no App Curral"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Não recebeu o código? Peça ao seu gestor para clicar em <strong>"Reenviar código"</strong> no sistema.
          </p>
        </form>
      )}
    </div>
  );
}
