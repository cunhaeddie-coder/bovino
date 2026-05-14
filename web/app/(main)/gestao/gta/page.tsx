"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Gta = {
  id: number;
  numero_gta: string | null;
  tipo: "entrada" | "saida";
  finalidade: string;
  origem_nome: string | null;
  origem_municipio: string | null;
  origem_estado: string | null;
  destino_nome: string | null;
  destino_municipio: string | null;
  destino_estado: string | null;
  data_emissao: string;
  data_validade: string | null;
  qtd_animais: number;
  especie: string;
  categorias: string | null;
  status: "emitida" | "em_transito" | "concluida" | "cancelada";
  observacoes: string | null;
};

type Resumo = {
  total: number; emitidas: number; em_transito: number;
  concluidas: number; saidas: number; entradas: number;
  total_animais: number; vencendo_hoje: number;
};

const STATUS_COR: Record<string, string> = {
  emitida:     "bg-blue-100 text-blue-700",
  em_transito: "bg-yellow-100 text-yellow-700",
  concluida:   "bg-green-100 text-green-700",
  cancelada:   "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  emitida: "Emitida", em_transito: "Em trânsito", concluida: "Concluída", cancelada: "Cancelada",
};
const FINALIDADE_LABEL: Record<string, string> = {
  venda: "Venda", abate: "Abate", reproducao: "Reprodução",
  exposicao: "Exposição", pastagem: "Pastagem", retorno: "Retorno", outros: "Outros",
};

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

function vencendo(gta: Gta) {
  if (!gta.data_validade || gta.status === "concluida" || gta.status === "cancelada") return false;
  const diff = new Date(gta.data_validade).getTime() - Date.now();
  return diff >= 0 && diff <= 3 * 86400_000;
}

function vencida(gta: Gta) {
  if (!gta.data_validade || gta.status === "concluida" || gta.status === "cancelada") return false;
  return new Date(gta.data_validade).getTime() < Date.now();
}

export default function GtaPage() {
  const [gtas, setGtas]           = useState<Gta[]>([]);
  const [resumo, setResumo]       = useState<Resumo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filtroTipo, setFiltroTipo]     = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo)   params.set("tipo",   filtroTipo);
      if (filtroStatus) params.set("status", filtroStatus);
      const [r, l] = await Promise.all([
        api.get("/gestao/gta/resumo").then(r => r.data).catch(() => null),
        api.get(`/gestao/gta?${params}`).then(r => r.data?.data ?? r.data).catch(() => []),
      ]);
      setResumo(r);
      setGtas(Array.isArray(l) ? l : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [filtroTipo, filtroStatus]);

  async function mudarStatus(id: number, status: string) {
    await api.patch(`/gestao/gta/${id}/status`, { status }).catch(() => null);
    carregar();
  }

  async function deletar(id: number) {
    if (!confirm("Excluir esta GTA?")) return;
    await api.delete(`/gestao/gta/${id}`).catch(() => null);
    carregar();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GTA — Guia de Trânsito Animal</h1>
          <p className="text-gray-500 text-sm">Registro e controle de movimentação do rebanho</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-green-700 hover:bg-green-800 text-white font-semibold text-sm px-5 py-2.5 rounded-full">
          + Nova GTA
        </button>
      </div>

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de GTAs",    value: resumo.total,         icon: "📋", cor: "text-gray-800" },
            { label: "Em trânsito",      value: resumo.em_transito,   icon: "🚛", cor: "text-yellow-700" },
            { label: "Animais movidos",  value: resumo.total_animais, icon: "🐄", cor: "text-green-700" },
            { label: "Saídas / Entradas",value: `${resumo.saidas} / ${resumo.entradas}`, icon: "↕️", cor: "text-blue-700" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xl mb-1">{k.icon}</p>
              <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerta vencimento */}
      {(resumo?.vencendo_hoje ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <p className="text-amber-800 font-semibold text-sm">
            {resumo!.vencendo_hoje} GTA(s) vencem nos próximos 3 dias — verifique a lista abaixo
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
          <option value="">Entrada e Saída</option>
          <option value="saida">Somente Saídas</option>
          <option value="entrada">Somente Entradas</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
          <option value="">Todos os status</option>
          <option value="emitida">Emitida</option>
          <option value="em_transito">Em trânsito</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading && <p className="text-center text-gray-400 py-10">Carregando...</p>}
        {!loading && gtas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 font-medium">Nenhuma GTA registrada</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "+ Nova GTA" para registrar a primeira</p>
          </div>
        )}
        {gtas.map(g => (
          <div key={g.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${vencida(g) ? "border-red-300" : vencendo(g) ? "border-amber-300" : "border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Tipo badge */}
                <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${g.tipo === "saida" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                  {g.tipo === "saida" ? "↑ Saída" : "↓ Entrada"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {g.numero_gta && (
                      <span className="font-mono text-sm font-bold text-gray-800">#{g.numero_gta}</span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">{FINALIDADE_LABEL[g.finalidade] ?? g.finalidade}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COR[g.status]}`}>
                      {STATUS_LABEL[g.status]}
                    </span>
                    {vencida(g)   && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Vencida</span>}
                    {vencendo(g)  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Vence em breve</span>}
                  </div>
                  {/* Origem → Destino */}
                  <p className="text-xs text-gray-500 mt-1">
                    {g.origem_nome || g.origem_municipio
                      ? `${g.origem_nome || g.origem_municipio}${g.origem_estado ? `/${g.origem_estado}` : ""}`
                      : "—"}
                    {" → "}
                    {g.destino_nome || g.destino_municipio
                      ? `${g.destino_nome || g.destino_municipio}${g.destino_estado ? `/${g.destino_estado}` : ""}`
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.qtd_animais} animal(is) · Emissão: {fmt(g.data_emissao)}
                    {g.data_validade && ` · Validade: ${fmt(g.data_validade)}`}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                {g.status === "emitida" && (
                  <button onClick={() => mudarStatus(g.id, "em_transito")}
                    className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-lg font-medium">
                    Em trânsito
                  </button>
                )}
                {(g.status === "emitida" || g.status === "em_transito") && (
                  <button onClick={() => mudarStatus(g.id, "concluida")}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium">
                    Concluir
                  </button>
                )}
                <button onClick={() => deletar(g.id)}
                  className="text-xs text-gray-300 hover:text-red-500 px-1 py-1 rounded-lg ml-1">
                  ✕
                </button>
              </div>
            </div>
            {g.observacoes && (
              <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50 italic">{g.observacoes}</p>
            )}
          </div>
        ))}
      </div>

      {showModal && <GtaModal onClose={() => setShowModal(false)} onDone={carregar} />}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  numero_gta: "", tipo: "saida", finalidade: "venda",
  origem_nome: "", origem_municipio: "", origem_estado: "",
  destino_nome: "", destino_municipio: "", destino_estado: "",
  data_emissao: new Date().toISOString().split("T")[0],
  data_validade: "", qtd_animais: "1", especie: "bovina",
  categorias: "", observacoes: "",
};

function GtaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErro("");
    try {
      await api.post("/gestao/gta", { ...form, qtd_animais: parseInt(form.qtd_animais) || 1 });
      onDone(); onClose();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao salvar. Verifique os campos.");
      setSaving(false);
    }
  }

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400";
  const sel = inp + " bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">Nova GTA</h2>
          <button onClick={onClose} className="text-gray-400 text-xl hover:text-gray-600">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {erro && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{erro}</p>}

          {/* Tipo + Finalidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["saida","entrada"] as const).map(t => (
                  <button key={t} type="button" onClick={() => set("tipo", t)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition ${form.tipo === t ? (t === "saida" ? "bg-orange-500 text-white border-orange-500" : "bg-blue-500 text-white border-blue-500") : "border-gray-200 text-gray-600"}`}>
                    {t === "saida" ? "↑ Saída" : "↓ Entrada"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Finalidade *</label>
              <select value={form.finalidade} onChange={e => set("finalidade", e.target.value)} className={sel}>
                {Object.entries(FINALIDADE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Número + Espécie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número da GTA</label>
              <input value={form.numero_gta} onChange={e => set("numero_gta", e.target.value)} placeholder="Ex: GTA-00001" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Espécie</label>
              <select value={form.especie} onChange={e => set("especie", e.target.value)} className={sel}>
                <option value="bovina">Bovina</option>
                <option value="bubalina">Bubalina</option>
                <option value="equina">Equina</option>
                <option value="suina">Suína</option>
                <option value="ovina">Ovina</option>
                <option value="caprina">Caprina</option>
              </select>
            </div>
          </div>

          {/* Origem */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Origem</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <input value={form.origem_nome} onChange={e => set("origem_nome", e.target.value)} placeholder="Nome da fazenda" className={inp} />
              </div>
              <div>
                <input value={form.origem_municipio} onChange={e => set("origem_municipio", e.target.value)} placeholder="Município" className={inp} />
              </div>
              <div>
                <select value={form.origem_estado} onChange={e => set("origem_estado", e.target.value)} className={sel}>
                  <option value="">UF</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Destino */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Destino</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <input value={form.destino_nome} onChange={e => set("destino_nome", e.target.value)} placeholder="Nome da fazenda" className={inp} />
              </div>
              <div>
                <input value={form.destino_municipio} onChange={e => set("destino_municipio", e.target.value)} placeholder="Município" className={inp} />
              </div>
              <div>
                <select value={form.destino_estado} onChange={e => set("destino_estado", e.target.value)} className={sel}>
                  <option value="">UF</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Datas + Qtd */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data de emissão *</label>
              <input type="date" required value={form.data_emissao} onChange={e => set("data_emissao", e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Validade</label>
              <input type="date" value={form.data_validade} onChange={e => set("data_validade", e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Qtd. animais *</label>
              <input type="number" required min="1" value={form.qtd_animais} onChange={e => set("qtd_animais", e.target.value)} className={inp} />
            </div>
          </div>

          {/* Categorias + Observações */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Categorias (ex: 10 bois + 5 vacas)</label>
            <input value={form.categorias} onChange={e => set("categorias", e.target.value)} placeholder="Descrição livre das categorias" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} rows={2} className={inp} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Registrar GTA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
