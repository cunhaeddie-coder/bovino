"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Lancamento = {
  id: number; tipo: "receita" | "despesa"; categoria: string;
  valor: number; data: string; descricao: string | null;
};

type Resumo = {
  receitas_mes: number; despesas_mes: number; saldo_mes: number;
  ultimos_6_meses: { mes: string; receitas: number; despesas: number }[];
  categorias_despesa: { categoria: string; total: number }[];
};

type Paginado<T> = { data: T[]; total: number; current_page: number; last_page: number };

type ContadorAcesso = {
  token: string; nome: string | null; expira_em: string | null;
  tem_pin: boolean; ultimo_acesso: string | null;
} | null;

// ── Categorias ────────────────────────────────────────────────────────────────

const CATEGORIAS_RECEITA: [string, string][] = [
  ["venda_gado",    "Venda de gado"],
  ["venda_leite",   "Venda de leite"],
  ["arrendamento",  "Arrendamento"],
  ["outros_receita","Outras receitas"],
];

const CATEGORIAS_DESPESA: [string, string][] = [
  ["alimentacao",  "Ração / Alimentação"],
  ["sanidade",     "Vacinas / Sanidade"],
  ["funcionarios", "Funcionários"],
  ["combustivel",  "Combustível"],
  ["manutencao",   "Manutenção"],
  ["pastagem",     "Pastagem / Terra"],
  ["impostos",     "Impostos / Taxas"],
  ["outros_despesa","Outras despesas"],
];

const ALL_CATS = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA];
const catLabel = (c: string) => ALL_CATS.find(([k]) => k === c)?.[1] ?? c;

const fmt   = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Utilitários ───────────────────────────────────────────────────────────────

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesPtBR(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[Number(m) - 1]}/${y.slice(2)}`;
}

// ── Modal de lançamento ───────────────────────────────────────────────────────

function ModalLancamento({
  tipoInicial, onClose, onSalvo,
}: { tipoInicial: "receita" | "despesa"; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({
    tipo:      tipoInicial as "receita" | "despesa",
    categoria: tipoInicial === "receita" ? "venda_gado" : "alimentacao",
    valor:     "",
    data:      new Date().toISOString().slice(0, 10),
    descricao: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const cats = form.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  function handleTipo(t: "receita" | "despesa") {
    setForm(p => ({
      ...p, tipo: t,
      categoria: t === "receita" ? "venda_gado" : "alimentacao",
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/gestao/fiscal", { ...form, valor: Number(form.valor) });
      onSalvo(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Novo lançamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(["receita", "despesa"] as const).map(t => (
              <button key={t} type="button" onClick={() => handleTipo(t)}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                  form.tipo === t
                    ? t === "receita"
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-red-500 border-red-500 text-white"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                {t === "receita" ? "↑ Receita" : "↓ Despesa"}
              </button>
            ))}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {cats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
              <input required type="number" min="0.01" step="0.01"
                value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0,00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data *</label>
              <input required type="date" value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input type="text" maxLength={500}
              value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Venda de 30 bois para frigorífico..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition ${
                form.tipo === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
              }`}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function FiscalPage() {
  const [mes, setMes]         = useState(mesAtual());
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [lista, setLista]     = useState<Paginado<Lancamento> | null>(null);
  const [aba, setAba]         = useState<"visao" | "lista" | "contador">("visao");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal]     = useState<"receita" | "despesa" | null>(null);
  const [exportando, setExportando] = useState(false);
  const [acesso, setAcesso]   = useState<ContadorAcesso>(undefined as any);
  const [acessoForm, setAcessoForm] = useState({ nome: "", pin: "", expira_em: "" });
  const [acessoSaving, setAcessoSaving] = useState(false);
  const [acessoCopiado, setAcessoCopiado] = useState(false);

  async function carregarResumo() {
    const { data } = await api.get(`/gestao/fiscal/resumo?mes=${mes}`);
    setResumo(data);
  }

  async function carregarLista() {
    const params = new URLSearchParams({ mes });
    if (filtroTipo) params.set("tipo", filtroTipo);
    const { data } = await api.get(`/gestao/fiscal?${params}`);
    setLista(data);
  }

  async function carregarAcesso() {
    try {
      const { data } = await api.get("/gestao/fiscal/contador-acesso");
      setAcesso(data);
      if (data) setAcessoForm(f => ({ ...f, nome: data.nome ?? "", expira_em: data.expira_em ?? "" }));
    } catch { setAcesso(null); }
  }

  useEffect(() => { carregarResumo(); }, [mes]);
  useEffect(() => { if (aba === "lista") carregarLista(); }, [aba, mes, filtroTipo]);
  useEffect(() => { if (aba === "contador") carregarAcesso(); }, [aba]);

  const urlContador = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/contador/${token}`;

  async function salvarAcesso(e: React.FormEvent) {
    e.preventDefault();
    setAcessoSaving(true);
    try {
      const payload: any = { nome: acessoForm.nome || null, expira_em: acessoForm.expira_em || null };
      if (acessoForm.pin) payload.pin = acessoForm.pin;
      await api.post("/gestao/fiscal/contador-acesso", payload);
      setAcessoForm(f => ({ ...f, pin: "" }));
      await carregarAcesso();
    } finally { setAcessoSaving(false); }
  }

  async function revogarAcesso() {
    if (!confirm("Revogar o link? O contador perderá o acesso imediatamente.")) return;
    await api.delete("/gestao/fiscal/contador-acesso");
    setAcesso(null);
  }

  async function renovarToken() {
    if (!confirm("Gerar um novo link? O link antigo deixará de funcionar.")) return;
    const { data } = await api.post("/gestao/fiscal/contador-acesso/renovar");
    await carregarAcesso();
  }

  function copiarLink(token: string) {
    navigator.clipboard?.writeText(urlContador(token));
    setAcessoCopiado(true);
    setTimeout(() => setAcessoCopiado(false), 2500);
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await api.delete(`/gestao/fiscal/${id}`);
    carregarResumo();
    if (aba === "lista") carregarLista();
  }

  async function exportar() {
    setExportando(true);
    try {
      const params = new URLSearchParams({ mes });
      if (filtroTipo) params.set("tipo", filtroTipo);
      const resp = await api.get(`/gestao/fiscal/exportar?${params}`, { responseType: "blob" });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `lancamentos-fiscais-${mes}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  // Gráfico de barras — últimos 6 meses
  const maxBar = Math.max(...(resumo?.ultimos_6_meses.flatMap(m => [m.receitas, m.despesas]) ?? [1]), 1);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Movimentação Fiscal</h1>
          <p className="text-xs text-gray-400 mt-0.5">Controle de receitas e despesas para o seu contador</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={() => setModal("receita")}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition">
            + Receita
          </button>
          <button onClick={() => setModal("despesa")}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition">
            + Despesa
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-semibold">Receitas</p>
          <p className="text-xl font-extrabold text-green-700 mt-1">{fmt(resumo?.receitas_mes ?? 0)}</p>
          <p className="text-[10px] text-green-500 mt-0.5">{mesPtBR(mes)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-semibold">Despesas</p>
          <p className="text-xl font-extrabold text-red-600 mt-1">{fmt(resumo?.despesas_mes ?? 0)}</p>
          <p className="text-[10px] text-red-400 mt-0.5">{mesPtBR(mes)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${(resumo?.saldo_mes ?? 0) >= 0 ? "bg-slate-50 border-slate-100" : "bg-orange-50 border-orange-100"}`}>
          <p className="text-xs text-slate-500 font-semibold">Saldo</p>
          <p className={`text-xl font-extrabold mt-1 ${(resumo?.saldo_mes ?? 0) >= 0 ? "text-slate-800" : "text-orange-600"}`}>
            {fmt(resumo?.saldo_mes ?? 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{mesPtBR(mes)}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["visao", "Visão Geral"], ["lista", "Lançamentos"], ["contador", "Acesso Contador"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${aba === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {aba === "visao" && resumo && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Gráfico 6 meses */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Últimos 6 meses</h3>
            <div className="space-y-3">
              {resumo.ultimos_6_meses.map(m => (
                <div key={m.mes}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-semibold">{mesPtBR(m.mes)}</span>
                    <span className={m.receitas - m.despesas >= 0 ? "text-green-600" : "text-red-500"}>
                      {fmt(m.receitas - m.despesas)}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-green-500 rounded-full transition-all"
                      style={{ width: `${(m.receitas / maxBar) * 100}%` }} />
                    <div className="bg-red-400 rounded-full transition-all"
                      style={{ width: `${(m.despesas / maxBar) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] mt-1">
                    <span className="text-green-600">↑ {fmt(m.receitas)}</span>
                    <span className="text-red-500">↓ {fmt(m.despesas)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1 text-[10px] text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Receitas</span>
              <span className="flex items-center gap-1 text-[10px] text-red-500"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Despesas</span>
            </div>
          </div>

          {/* Despesas por categoria */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Despesas por categoria — {mesPtBR(mes)}</h3>
            {resumo.categorias_despesa.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste mês</p>
            ) : (
              <div className="space-y-3">
                {resumo.categorias_despesa.map(c => {
                  const pct = resumo.despesas_mes > 0 ? (c.total / resumo.despesas_mes) * 100 : 0;
                  return (
                    <div key={c.categoria}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">{catLabel(c.categoria)}</span>
                        <span className="text-slate-500">{fmt(c.total)} <span className="text-[10px] text-slate-400">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Exportar para contador */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-2">Exportar para seu contador (CSV)</p>
              <button onClick={exportar} disabled={exportando}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold transition disabled:opacity-50">
                {exportando ? "Gerando..." : "⬇ Exportar lançamentos CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Lançamentos ── */}
      {aba === "lista" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {([["", "Todos"], ["receita", "Receitas"], ["despesa", "Despesas"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFiltroTipo(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroTipo === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={exportar} disabled={exportando}
              className="ml-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold">
              {exportando ? "Gerando..." : "⬇ Exportar CSV"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-3 py-3">Categoria</th>
                  <th className="text-left px-3 py-3">Descrição</th>
                  <th className="text-right px-3 py-3">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!lista ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
                ) : lista.data.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum lançamento neste período.</td></tr>
                ) : lista.data.map(l => (
                  <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.tipo === "receita" ? "bg-green-500" : "bg-red-400"}`} />
                        <span className="text-xs text-slate-700">{catLabel(l.categoria)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{l.descricao ?? <span className="text-slate-300">—</span>}</td>
                    <td className={`px-3 py-3 text-xs font-bold text-right whitespace-nowrap ${l.tipo === "receita" ? "text-green-600" : "text-red-500"}`}>
                      {l.tipo === "receita" ? "+" : "−"} {fmtFull(l.valor)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => excluir(l.id)} className="text-slate-300 hover:text-red-400 text-sm transition">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista && lista.last_page > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-center">
                Página {lista.current_page} de {lista.last_page} · {lista.total} lançamentos
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Acesso do Contador ── */}
      {aba === "contador" && (
        <div className="space-y-4 max-w-lg">
          {acesso === undefined ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : acesso ? (
            <>
              {/* Link ativo */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Link ativo</h3>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Ativo</span>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-xs text-slate-600 truncate flex-1 font-mono">{urlContador(acesso.token)}</span>
                  <button onClick={() => copiarLink(acesso.token)}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 shrink-0 transition">
                    {acessoCopiado ? "✓ Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div><span className="text-slate-400">Nome:</span> {acesso.nome ?? <span className="italic text-slate-300">não definido</span>}</div>
                  <div><span className="text-slate-400">PIN:</span> {acesso.tem_pin ? "🔒 Configurado" : <span className="text-orange-500">⚠ Sem PIN</span>}</div>
                  <div><span className="text-slate-400">Expira:</span> {acesso.expira_em ? new Date(acesso.expira_em + "T12:00:00").toLocaleDateString("pt-BR") : "Nunca"}</div>
                  <div><span className="text-slate-400">Último acesso:</span> {acesso.ultimo_acesso ? new Date(acesso.ultimo_acesso).toLocaleDateString("pt-BR") : "Nunca"}</div>
                </div>

                {!acesso.tem_pin && (
                  <p className="text-[11px] text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                    ⚠ Recomendado: configure um PIN para proteger o link caso ele seja encaminhado para outra pessoa.
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={renovarToken}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold">
                    🔄 Novo link
                  </button>
                  <button onClick={revogarAcesso}
                    className="flex-1 py-2 rounded-xl border border-red-200 text-xs text-red-500 hover:bg-red-50 font-semibold">
                    Revogar acesso
                  </button>
                </div>
              </div>

              {/* Editar configurações */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Configurações</h3>
                <form onSubmit={salvarAcesso} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do contador</label>
                    <input type="text" value={acessoForm.nome}
                      onChange={e => setAcessoForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Contador João Silva"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        PIN <span className="text-slate-400 font-normal">(4–6 dígitos)</span>
                      </label>
                      <input type="password" inputMode="numeric" minLength={4} maxLength={6}
                        value={acessoForm.pin}
                        onChange={e => setAcessoForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                        placeholder={acesso.tem_pin ? "••••" : "Definir PIN"}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Validade</label>
                      <input type="date" value={acessoForm.expira_em}
                        onChange={e => setAcessoForm(f => ({ ...f, expira_em: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">💡 Envie o link e o PIN por canais separados (ex: WhatsApp + SMS)</p>
                  <button type="submit" disabled={acessoSaving}
                    className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50">
                    {acessoSaving ? "Salvando..." : "Salvar configurações"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Nenhum link criado ainda */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🔗</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Compartilhar com contador</h3>
                <p className="text-xs text-slate-400 mt-1">Gere um link para seu contador acessar os lançamentos sem precisar de uma conta.</p>
              </div>
              <form onSubmit={salvarAcesso} className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do contador <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <input type="text" value={acessoForm.nome}
                    onChange={e => setAcessoForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Contador João Silva"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">PIN <span className="text-slate-400 font-normal">(recomendado)</span></label>
                    <input type="password" inputMode="numeric" minLength={4} maxLength={6}
                      value={acessoForm.pin}
                      onChange={e => setAcessoForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                      placeholder="4–6 dígitos"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Validade</label>
                    <input type="date" value={acessoForm.expira_em}
                      onChange={e => setAcessoForm(f => ({ ...f, expira_em: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
                <button type="submit" disabled={acessoSaving}
                  className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50">
                  {acessoSaving ? "Gerando..." : "Gerar link de acesso"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalLancamento
          tipoInicial={modal}
          onClose={() => setModal(null)}
          onSalvo={() => { carregarResumo(); if (aba === "lista") carregarLista(); }}
        />
      )}
    </div>
  );
}
