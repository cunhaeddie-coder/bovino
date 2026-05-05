"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Status     = "aberta" | "em_analise" | "aprovada" | "implementada" | "recusada";
type Prioridade = "baixa" | "media" | "alta" | "critica";

interface Sugestao {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  status: Status;
  prioridade_admin: Prioridade | null;
  resposta_admin: string | null;
  respondida_em: string | null;
  created_at: string;
  user: { id: number; nome: string; email: string };
  fazenda: { id: number; nome: string };
}

const STATUS_OPTS: { value: Status; label: string; color: string }[] = [
  { value: "aberta",       label: "Aberta",       color: "bg-blue-100 text-blue-700"   },
  { value: "em_analise",   label: "Em análise",   color: "bg-yellow-100 text-yellow-700"},
  { value: "aprovada",     label: "Aprovada",     color: "bg-green-100 text-green-700"  },
  { value: "implementada", label: "Implementada", color: "bg-purple-100 text-purple-700"},
  { value: "recusada",     label: "Recusada",     color: "bg-red-100 text-red-700"      },
];

const PRIO_OPTS: { value: Prioridade; label: string }[] = [
  { value: "baixa",   label: "Baixa"   },
  { value: "media",   label: "Média"   },
  { value: "alta",    label: "Alta"    },
  { value: "critica", label: "Crítica" },
];

const INPUT = "w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-400";

export default function SugestoesAdminPage() {
  const [lista, setLista]     = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus]     = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [aberto, setAberto]   = useState<Sugestao | null>(null);
  const [form, setForm]       = useState({ status: "" as Status, prioridade_admin: "" as Prioridade | "", resposta_admin: "" });
  const [saving, setSaving]   = useState(false);

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroStatus) params.set("status", filtroStatus);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    const { data } = await api.get(`/sugestoes?${params}`);
    setLista(data.data ?? data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtroStatus, filtroCategoria]);

  function abrir(s: Sugestao) {
    setAberto(s);
    setForm({
      status: s.status,
      prioridade_admin: s.prioridade_admin ?? "",
      resposta_admin: s.resposta_admin ?? "",
    });
  }

  async function salvar() {
    if (!aberto) return;
    setSaving(true);
    await api.put(`/sugestoes/${aberto.id}/responder`, {
      status: form.status,
      prioridade_admin: form.prioridade_admin || null,
      resposta_admin: form.resposta_admin || null,
    });
    setSaving(false);
    setAberto(null);
    carregar();
  }

  const statusInfo = (s: Status) => STATUS_OPTS.find((o) => o.value === s);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">💡 Sugestões dos Clientes</h1>
          <p className="text-sm text-slate-400 mt-0.5">{lista.length} sugestão(ões)</p>
        </div>
        <div className="flex gap-2">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className="border border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-700 text-slate-200 focus:outline-none">
            <option value="">Todos os status</option>
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-700 text-slate-200 focus:outline-none">
            <option value="">Todas as categorias</option>
            {["funcionalidade","bug","usabilidade","desempenho","outro"].map((c) =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm py-12 text-center">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-slate-400 text-sm">Nenhuma sugestão encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((s) => {
            const si = statusInfo(s.status);
            return (
              <div key={s.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 p-5 hover:border-slate-500 transition-colors cursor-pointer"
                onClick={() => abrir(s)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {si && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${si.color}`}>{si.label}</span>}
                      {s.prioridade_admin && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.prioridade_admin === "critica" ? "bg-red-900 text-red-300" :
                          s.prioridade_admin === "alta"    ? "bg-orange-900 text-orange-300" :
                          "bg-slate-700 text-slate-300"
                        }`}>P: {s.prioridade_admin}</span>
                      )}
                      <span className="text-xs text-slate-500">{s.categoria}</span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm">{s.titulo}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{s.descricao}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-300 font-medium">{s.user?.nome}</p>
                    <p className="text-xs text-slate-500">{s.fazenda?.nome}</p>
                    <p className="text-xs text-slate-600 mt-1">{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de resposta */}
      {aberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setAberto(null)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-100 text-base">{aberto.titulo}</h2>
            <p className="text-sm text-slate-400">{aberto.descricao}</p>
            <p className="text-xs text-slate-500">Por {aberto.user?.nome} · {aberto.fazenda?.nome}</p>

            <div className="border-t border-slate-700 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className={INPUT}>
                    {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prioridade</label>
                  <select value={form.prioridade_admin} onChange={(e) => setForm({ ...form, prioridade_admin: e.target.value as Prioridade })}
                    className={INPUT}>
                    <option value="">— Sem prioridade —</option>
                    {PRIO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Resposta para o cliente (opcional)</label>
                <textarea value={form.resposta_admin} onChange={(e) => setForm({ ...form, resposta_admin: e.target.value })}
                  rows={3} placeholder="Ex: Agradecemos a sugestão! Adicionamos ao nosso roadmap."
                  className={INPUT + " resize-none"} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setAberto(null)}
                className="flex-1 border border-slate-600 text-slate-300 rounded-lg py-2 text-sm font-medium hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar resposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
