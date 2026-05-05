"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function AnuncianteCadastroPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    empresa: "",
    cnpj: "",
    responsavel: "",
    celular: "",
    email: "",
    password: "",
    password_confirmation: "",
    site: "",
    estado: "",
    descricao: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function formatCnpj(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.password_confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    const cnpjRaw = form.cnpj.replace(/\D/g, "");
    if (cnpjRaw.length !== 14) {
      setError("CNPJ deve ter 14 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, cnpj: cnpjRaw };
      const { data } = await api.post("/anunciante/cadastro", payload);

      localStorage.setItem("bovino_anunciante_token", data.token);
      router.push("/anunciante/painel");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (err.response?.data?.errors) {
        const msgs = Object.values(err.response.data.errors).flat();
        setError(msgs[0]);
      } else {
        setError(err.response?.data?.message ?? "Erro ao cadastrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header simples */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-2xl font-extrabold text-green-700">Bovino</Link>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600 text-sm font-medium">Cadastro de Empresa</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Crie sua conta de anunciante</h1>
          <p className="text-gray-500 text-sm mb-8">
            Publique banners para milhares de produtores e compradores de gado.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Razão social / Nome da empresa *</label>
                <input
                  required
                  value={form.empresa}
                  onChange={(e) => set("empresa", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Agropecuária Ltda"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ *</label>
                <input
                  required
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", formatCnpj(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">Todos os estados</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do responsável *</label>
                <input
                  required
                  value={form.responsavel}
                  onChange={(e) => set("responsavel", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="João da Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Celular *</label>
                <input
                  required
                  value={form.celular}
                  onChange={(e) => set("celular", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="(11) 91234-5678"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Site (opcional)</label>
                <input
                  type="url"
                  value={form.site}
                  onChange={(e) => set("site", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://www.empresa.com.br"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição (opcional)</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Breve descrição da sua empresa..."
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Senha *</label>
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-8 text-gray-400"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar senha *</label>
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={form.password_confirmation}
                  onChange={(e) => set("password_confirmation", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-full mt-2 transition disabled:opacity-60"
            >
              {loading ? "Criando conta..." : "Criar conta de anunciante"}
            </button>

            <p className="text-center text-xs text-gray-500">
              Já tem conta?{" "}
              <Link href="/anunciante/login" className="text-green-600 font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
