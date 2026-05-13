"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Registro = {
  id: number; data: string;
  litros_manha: number; litros_tarde: number; litros_noite: number;
  preco_litro: number; observacao: string | null;
};

type Resumo = {
  mes: string;
  dias_registrados: number;
  total_litros: number;
  media_dia: number;
  preco_medio: number;
  receita_mes: number;
  melhor_dia: { data: string; total: number } | null;
  ultimos_30_dias: { data: string; total: number; preco_litro: number }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt    = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtL   = (v: number) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L`;
const hoje   = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

function mesPtBR(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[Number(m)-1]}/${y.slice(2)}`;
}

// ── Formulário de lançamento ──────────────────────────────────────────────────

function FormLancamento({ onSalvo }: { onSalvo: () => void }) {
  const [form, setForm] = useState({
    data: hoje(), litros_manha: "", litros_tarde: "", litros_noite: "", preco_litro: "", observacao: "",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState("");
  const [ok, setOk]         = useState(false);

  // Preenche último preço na montagem
  useEffect(() => {
    api.get("/gestao/leite/ultimo-preco")
      .then(({ data }) => { if (data.preco_litro) setForm(f => ({ ...f, preco_litro: String(data.preco_litro) })); })
      .catch(() => {});
  }, []);

  const totalL = (Number(form.litros_manha) || 0) + (Number(form.litros_tarde) || 0) + (Number(form.litros_noite) || 0);
  const receita = totalL * (Number(form.preco_litro) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro(""); setOk(false);
    try {
      await api.post("/gestao/leite", {
        ...form,
        litros_manha: Number(form.litros_manha) || 0,
        litros_tarde: Number(form.litros_tarde) || 0,
        litros_noite: Number(form.litros_noite) || 0,
        preco_litro:  Number(form.preco_litro)  || 0,
      });
      setOk(true);
      onSalvo();
      setTimeout(() => setOk(false), 3000);
    } catch (err: any) {
      const msgs = err.response?.data?.errors;
      setErro(msgs ? Object.values(msgs).flat().join(" ") : (err.response?.data?.message ?? "Erro ao salvar."));
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-800 mb-4">Lançamento diário</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Data</label>
            <input type="date" required value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Manhã (L)</label>
            <input type="number" required min="0" step="0.01" value={form.litros_manha}
              onChange={e => setForm(f => ({ ...f, litros_manha: e.target.value }))}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tarde (L)</label>
            <input type="number" min="0" step="0.01" value={form.litros_tarde}
              onChange={e => setForm(f => ({ ...f, litros_tarde: e.target.value }))}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Noite (L)</label>
            <input type="number" min="0" step="0.01" value={form.litros_noite}
              onChange={e => setForm(f => ({ ...f, litros_noite: e.target.value }))}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Preço por litro (R$)</label>
            <input type="number" required min="0" step="0.0001" value={form.preco_litro}
              onChange={e => setForm(f => ({ ...f, preco_litro: e.target.value }))}
              placeholder="Ex: 2.80"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Observação</label>
            <input type="text" maxLength={500} value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              placeholder="Opcional"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Preview */}
        {totalL > 0 && (
          <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-blue-600 font-semibold">Total do dia: <strong>{fmtL(totalL)}</strong></span>
            {Number(form.preco_litro) > 0 && (
              <span className="text-xs text-blue-700 font-bold">Receita: {fmt(receita)}</span>
            )}
          </div>
        )}

        {erro && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        {ok   && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">✓ Lançamento salvo!</p>}

        <button type="submit" disabled={saving}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar produção do dia"}
        </button>
      </form>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function LeiteiroPage() {
  const [mes, setMes]         = useState(mesAtual());
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [aba, setAba]         = useState<"grafico" | "historico">("grafico");
  const [exportando, setExportando] = useState(false);

  async function carregar() {
    try {
      const [res, reg] = await Promise.all([
        api.get(`/gestao/leite/resumo?mes=${mes}`).then(r => r.data),
        api.get(`/gestao/leite?mes=${mes}`).then(r => r.data),
      ]);
      setResumo(res);
      setRegistros(reg);
    } catch {}
  }

  useEffect(() => { carregar(); }, [mes]);

  async function excluir(id: number) {
    if (!confirm("Excluir este registro?")) return;
    await api.delete(`/gestao/leite/${id}`);
    carregar();
  }

  async function exportar() {
    setExportando(true);
    try {
      const r = await api.get(`/gestao/leite/exportar?mes=${mes}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `producao-leite-${mes}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExportando(false); }
  }

  // Gráfico — últimos 30 dias
  const maxL = Math.max(...(resumo?.ultimos_30_dias.map(d => Number(d.total)) ?? [1]), 1);

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Produção de Leite</h1>
          <p className="text-xs text-gray-400 mt-0.5">Controle diário da produção leiteira</p>
        </div>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Formulário de lançamento */}
      <FormLancamento onSalvo={carregar} />

      {/* KPIs do mês */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-blue-500 font-semibold uppercase">Total do mês</p>
            <p className="text-xl font-extrabold text-blue-700 mt-1">{fmtL(resumo.total_litros)}</p>
            <p className="text-[10px] text-blue-400">{resumo.dias_registrados} dias registrados</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Média/dia</p>
            <p className="text-xl font-extrabold text-slate-700 mt-1">{fmtL(resumo.media_dia)}</p>
            {resumo.melhor_dia && (
              <p className="text-[10px] text-slate-400">Melhor: {fmtL(Number(resumo.melhor_dia.total))}</p>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Preço médio/L</p>
            <p className="text-xl font-extrabold text-slate-700 mt-1">
              {resumo.preco_medio > 0 ? `R$ ${Number(resumo.preco_medio).toFixed(4)}` : "—"}
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-green-600 font-semibold uppercase">Receita do mês</p>
            <p className="text-xl font-extrabold text-green-700 mt-1">{fmt(resumo.receita_mes)}</p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["grafico", "Gráfico 30 dias"], ["historico", "Histórico do mês"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${aba === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Gráfico ── */}
      {aba === "grafico" && resumo && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Produção diária — últimos 30 dias</h3>
          {resumo.ultimos_30_dias.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum registro nos últimos 30 dias.</p>
          ) : (
            <div className="flex items-end gap-1 h-36">
              {resumo.ultimos_30_dias.map(d => {
                const total = Number(d.total);
                const pct   = (total / maxL) * 100;
                const data  = new Date(d.data + "T12:00:00");
                return (
                  <div key={d.data} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
                      {data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}: {fmtL(total)}
                    </div>
                    <div
                      className="w-full rounded-t-sm bg-blue-400 hover:bg-blue-500 transition-all"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                    {resumo.ultimos_30_dias.length <= 10 && (
                      <span className="text-[8px] text-slate-400">{data.getDate()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {resumo.ultimos_30_dias.length > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                Máx: <strong className="text-slate-600">{fmtL(maxL)}</strong>
              </span>
              <span className="text-[10px] text-slate-400">
                Dias com registro: <strong className="text-slate-600">{resumo.ultimos_30_dias.length}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ── */}
      {aba === "historico" && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button onClick={exportar} disabled={exportando}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
              {exportando ? "Gerando..." : "⬇ Exportar CSV"}
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-right px-3 py-3">Manhã</th>
                  <th className="text-right px-3 py-3">Tarde</th>
                  <th className="text-right px-3 py-3">Noite</th>
                  <th className="text-right px-3 py-3">Total</th>
                  <th className="text-right px-3 py-3">Preço/L</th>
                  <th className="text-right px-4 py-3">Receita</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum registro neste mês.</td></tr>
                ) : registros.map(r => {
                  const total   = Number(r.litros_manha) + Number(r.litros_tarde) + Number(r.litros_noite);
                  const receita = total * Number(r.preco_litro);
                  return (
                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-600 font-semibold">
                        {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-500">{Number(r.litros_manha) > 0 ? fmtL(Number(r.litros_manha)) : "—"}</td>
                      <td className="px-3 py-3 text-right text-xs text-slate-500">{Number(r.litros_tarde) > 0 ? fmtL(Number(r.litros_tarde)) : "—"}</td>
                      <td className="px-3 py-3 text-right text-xs text-slate-500">{Number(r.litros_noite) > 0 ? fmtL(Number(r.litros_noite)) : "—"}</td>
                      <td className="px-3 py-3 text-right text-xs font-bold text-blue-700">{fmtL(total)}</td>
                      <td className="px-3 py-3 text-right text-xs text-slate-400">R$ {Number(r.preco_litro).toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-green-700">{fmt(receita)}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => excluir(r.id)} className="text-slate-300 hover:text-red-400 text-sm transition">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
