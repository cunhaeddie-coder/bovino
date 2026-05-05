"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Anunciante, Paginated, Plano } from "@/lib/types";

export default function AnunciantesPage() {
  const [data, setData]       = useState<Paginated<Anunciante> | null>(null);
  const [planos, setPlanos]   = useState<Plano[]>([]);
  const [busca, setBusca]     = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [senhaTemp, setSenhaTemp] = useState("");

  const [form, setForm] = useState({
    empresa: "", cnpj: "", responsavel: "", celular: "",
    email: "", site: "", estado: "", plano_slug: "",
  });

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (busca)  params.set("busca", busca);
    if (status) params.set("status", status);
    const { data: res } = await api.get(`/anunciantes?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => {
    carregar(1);
    api.get("http://localhost:8000/api/planos").then(({ data: g }) => {
      const todos: Plano[] = Object.values(g).flat() as Plano[];
      setPlanos(todos.filter((p) => p.tipo === "anunciante"));
    });
  }, [busca, status]);

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const cnpjRaw = form.cnpj.replace(/\D/g, "");
    const { data: res } = await api.post("/anunciantes", { ...form, cnpj: cnpjRaw });
    setSenhaTemp(res.senha_temp);
    setModal(false);
    carregar(1);
  }

  async function toggleAtivo(id: number, ativo: boolean) {
    await api.post(`/anunciantes/${id}/${ativo ? "suspender" : "reativar"}`);
    carregar(page);
  }

  async function resetarSenha(id: number) {
    const { data: res } = await api.post(`/anunciantes/${id}/resetar-senha`);
    alert(`Nova senha temporária: ${res.senha_temp}`);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Anunciantes</h1>
        <button onClick={() => setModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
          + Novo anunciante
        </button>
      </div>

      {senhaTemp && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Anunciante criado! Senha temporária:</p>
            <p className="text-lg font-mono font-bold text-green-700 mt-1">{senhaTemp}</p>
            <p className="text-xs text-green-600">Envie esta senha para o anunciante por e-mail ou WhatsApp.</p>
          </div>
          <button onClick={() => setSenhaTemp("")} className="text-green-600 text-lg">✕</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por empresa, e-mail ou CNPJ..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-72" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="suspenso">Suspensos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Empresa</th>
                <th className="text-left px-3 py-3">CNPJ</th>
                <th className="text-left px-3 py-3">Responsável</th>
                <th className="text-left px-3 py-3">Plano</th>
                <th className="text-right px-3 py-3">Banners</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Cadastro</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum anunciante.</td></tr>
              ) : data?.data.map((a) => (
                <tr key={a.id} className={`border-t border-slate-50 hover:bg-slate-50 ${!a.ativo ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{a.empresa}</p>
                    <p className="text-xs text-slate-400">{a.email}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs font-mono">{a.cnpj}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{a.responsavel}</td>
                  <td className="px-3 py-3 text-xs">
                    {a.assinatura_ativa?.plano?.nome
                      ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{a.assinatura_ativa.plano.nome}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">{a.banners_count ?? 0}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {a.ativo ? "Ativo" : "Suspenso"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => toggleAtivo(a.id, a.ativo)}
                        className={`text-xs hover:underline ${a.ativo ? "text-orange-500" : "text-green-600"}`}>
                        {a.ativo ? "Suspender" : "Reativar"}
                      </button>
                      <button onClick={() => resetarSenha(a.id)} className="text-xs text-blue-500 hover:underline">Resetar senha</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{data.total} anunciantes · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal criar anunciante */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Novo anunciante</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCriar} className="grid grid-cols-2 gap-3">
              {[
                { field: "empresa", label: "Empresa *", placeholder: "Razão social", col: 2 },
                { field: "cnpj", label: "CNPJ *", placeholder: "00.000.000/0001-00", col: 1 },
                { field: "responsavel", label: "Responsável *", placeholder: "Nome completo", col: 1 },
                { field: "celular", label: "Celular *", placeholder: "(11) 91234-5678", col: 1 },
                { field: "email", label: "E-mail *", placeholder: "contato@empresa.com", col: 1 },
                { field: "site", label: "Site", placeholder: "https://empresa.com.br", col: 2 },
              ].map(({ field, label, placeholder, col }) => (
                <div key={field} className={col === 2 ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                  <input required={label.includes("*")} value={(form as Record<string, string>)[field]}
                    onChange={(e) => set(field, e.target.value)} placeholder={placeholder}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Plano inicial (opcional)</label>
                <select value={form.plano_slug} onChange={(e) => set("plano_slug", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Sem plano (negociação manual)</option>
                  {planos.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.nome} — {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex gap-3 mt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-bold transition">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
