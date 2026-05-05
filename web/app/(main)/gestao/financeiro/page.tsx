"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Custo = { id: number; categoria: string; descricao: string; valor: number; data: string; lote?: { nome: string } | null };
type ResumoAntigo = { por_categoria: Record<string, number>; total_ano: number };
type Resumo2 = {
  receitas_mes: number; custos_mes: number; lucro_mes: number;
  contas_pagar_total: number; contas_vencidas: number; contas_receber_total: number;
  receitas_por_categoria: { categoria: string; total: number }[];
};
type ContaPagar  = { id: number; descricao: string; categoria: string | null; valor: number; vencimento: string; status: string; fornecedor?: { nome: string } | null };
type ContaReceber= { id: number; descricao: string; cliente_nome: string | null; valor: number; vencimento: string; status: string };
type Receita     = { id: number; descricao: string; categoria: string; valor: number; data: string; lote?: { nome: string } | null };

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_COR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700", pago: "bg-green-100 text-green-700",
  recebido: "bg-green-100 text-green-700", vencido: "bg-red-100 text-red-700", cancelado: "bg-gray-100 text-gray-500",
};

export default function FinanceiroPage() {
  const [aba, setAba]               = useState<"dashboard"|"custos"|"receitas"|"pagar"|"receber">("dashboard");
  const [resumo, setResumo]         = useState<Resumo2 | null>(null);
  const [resumoAntigo, setResumoAntigo] = useState<ResumoAntigo | null>(null);
  const [custos, setCustos]         = useState<Custo[]>([]);
  const [receitas, setReceitas]     = useState<Receita[]>([]);
  const [contasPagar, setContasPagar]   = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCusto, setShowCusto]   = useState(false);
  const [showReceita, setShowReceita]   = useState(false);
  const [showPagar, setShowPagar]       = useState(false);
  const [showReceber, setShowReceber]   = useState(false);
  const [mes, setMes]   = useState(new Date().getMonth() + 1);
  const [ano, setAno]   = useState(new Date().getFullYear());

  async function carregar() {
    setLoading(true);
    const [r2, rv, ct, cpag, crec, custosData] = await Promise.all([
      api.get(`/gestao/financeiro2/resumo?mes=${mes}&ano=${ano}`).then(r => r.data).catch(() => null),
      api.get("/gestao/financeiro/resumo").then(r => r.data).catch(() => null),
      api.get("/gestao/financeiro").then(r => r.data).catch(() => []),
      api.get("/gestao/financeiro2/contas-pagar").then(r => r.data.data || []).catch(() => []),
      api.get("/gestao/financeiro2/contas-receber").then(r => r.data.data || []).catch(() => []),
      api.get("/gestao/financeiro2/receitas").then(r => r.data.data || []).catch(() => []),
    ]);
    setResumo(r2); setResumoAntigo(rv); setCustos(ct);
    setContasPagar(cpag); setContasReceber(crec); setReceitas(custosData);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [mes, ano]);

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro da Fazenda</h1>
          <p className="text-gray-500 text-sm">Receitas, custos, contas a pagar e receber</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(parseInt(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { k: "dashboard", label: "📊 Dashboard" },
          { k: "receitas",  label: "💚 Receitas" },
          { k: "custos",    label: "💸 Custos" },
          { k: "pagar",     label: `📤 A Pagar${resumo?.contas_vencidas ? ` ⚠️${resumo.contas_vencidas}` : ""}` },
          { k: "receber",   label: "📥 A Receber" },
        ] as const).map(({ k, label }) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${aba === k ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {aba === "dashboard" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Receitas no mês",    value: fmt(resumo?.receitas_mes ?? 0),          icon: "💚", cor: "text-green-700" },
              { label: "Custos no mês",      value: fmt(resumo?.custos_mes ?? 0),             icon: "💸", cor: "text-red-600" },
              { label: "Resultado do mês",   value: fmt(resumo?.lucro_mes ?? 0),              icon: resumo && resumo.lucro_mes >= 0 ? "📈" : "📉", cor: resumo && resumo.lucro_mes >= 0 ? "text-green-700" : "text-red-600" },
              { label: "A pagar (total)",    value: fmt(resumo?.contas_pagar_total ?? 0),     icon: "📤", cor: "text-orange-600" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xl mb-1">{k.icon}</p>
                <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Alertas de contas vencidas */}
          {(resumo?.contas_vencidas ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-700">{resumo!.contas_vencidas} conta(s) vencida(s)</p>
                <p className="text-xs text-red-500">Verifique a aba "A Pagar" para regularizar</p>
              </div>
              <button onClick={() => setAba("pagar")} className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold">Ver agora</button>
            </div>
          )}

          {/* A receber */}
          {(resumo?.contas_receber_total ?? 0) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-700">Valores a receber</p>
                <p className="text-2xl font-bold text-green-700">{fmt(resumo!.contas_receber_total)}</p>
              </div>
              <button onClick={() => setAba("receber")} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold">Ver detalhes</button>
            </div>
          )}

          {/* Custos históricos por categoria */}
          {resumoAntigo && Object.keys(resumoAntigo.por_categoria).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Custos por categoria (ano)</h2>
              <div className="space-y-3">
                {Object.entries(resumoAntigo.por_categoria)
                  .sort(([,a],[,b]) => b - a)
                  .map(([cat, val]) => {
                    const pct = resumoAntigo.total_ano > 0 ? (val / resumoAntigo.total_ano) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 capitalize">{cat.replace("_"," ")}</span>
                          <span className="font-semibold text-gray-800">{fmt(val)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                <span className="text-sm text-gray-500">Total do ano</span>
                <span className="font-bold text-gray-800">{fmt(resumoAntigo.total_ano)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEITAS */}
      {aba === "receitas" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowReceita(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Nova receita</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-3 py-3">Categoria</th>
                <th className="text-left px-3 py-3">Data</th>
                <th className="text-right px-5 py-3">Valor</th>
              </tr></thead>
              <tbody>
                {receitas.length === 0
                  ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhuma receita registrada</td></tr>
                  : receitas.map((r: Receita) => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{r.descricao}</p>
                        {r.lote && <p className="text-xs text-gray-400">Lote: {r.lote.nome}</p>}
                      </td>
                      <td className="px-3 py-3 capitalize text-gray-500 text-xs">{r.categoria?.replace("_"," ")}</td>
                      <td className="px-3 py-3 text-gray-400 text-xs">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right font-bold text-green-700">{fmt(r.valor)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOS */}
      {aba === "custos" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowCusto(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Novo custo</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-3 py-3">Categoria</th>
                <th className="text-left px-3 py-3">Data</th>
                <th className="text-right px-5 py-3">Valor</th>
              </tr></thead>
              <tbody>
                {custos.length === 0
                  ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhum custo registrado</td></tr>
                  : custos.map(c => (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{c.descricao}</p>
                        {c.lote && <p className="text-xs text-gray-400">Lote: {c.lote.nome}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs capitalize">{c.categoria?.replace("_"," ")}</td>
                      <td className="px-3 py-3 text-gray-400 text-xs">{new Date(c.data).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right font-bold text-red-600">{fmt(c.valor)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTAS A PAGAR */}
      {aba === "pagar" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowPagar(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Nova conta a pagar</button>
          </div>
          <div className="grid gap-3">
            {contasPagar.length === 0
              ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center"><p className="text-gray-400">Nenhuma conta cadastrada</p></div>
              : contasPagar.map(c => {
                const vencida = c.status === "pendente" && new Date(c.vencimento) < new Date();
                return (
                  <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between ${vencida ? "border-red-200" : "border-gray-100"}`}>
                    <div>
                      {vencida && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full mr-2">VENCIDA</span>}
                      <p className="font-semibold text-gray-800">{c.descricao}</p>
                      <p className="text-xs text-gray-400">
                        Vence: {new Date(c.vencimento).toLocaleDateString("pt-BR")}
                        {c.fornecedor && ` · ${c.fornecedor.nome}`}
                        {c.categoria && ` · ${c.categoria}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{fmt(c.valor)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[c.status]}`}>{c.status}</span>
                      </div>
                      {c.status === "pendente" && (
                        <button onClick={async () => {
                          await api.post(`/gestao/financeiro2/contas-pagar/${c.id}/pagar`, {});
                          carregar();
                        }} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold">
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* CONTAS A RECEBER */}
      {aba === "receber" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowReceber(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Nova conta a receber</button>
          </div>
          <div className="grid gap-3">
            {contasReceber.length === 0
              ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center"><p className="text-gray-400">Nenhuma conta a receber</p></div>
              : contasReceber.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{c.descricao}</p>
                    <p className="text-xs text-gray-400">
                      Vence: {new Date(c.vencimento).toLocaleDateString("pt-BR")}
                      {c.cliente_nome && ` · ${c.cliente_nome}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-green-700">{fmt(c.valor)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[c.status]}`}>{c.status}</span>
                    </div>
                    {c.status === "pendente" && (
                      <button onClick={async () => {
                        await api.post(`/gestao/financeiro2/contas-receber/${c.id}/receber`, {});
                        carregar();
                      }} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold">
                        Recebido
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modais */}
      {showCusto    && <CustoModal    onClose={() => setShowCusto(false)}    onDone={carregar} />}
      {showReceita  && <ReceitaModal  onClose={() => setShowReceita(false)}  onDone={carregar} />}
      {showPagar    && <ContaPagarModal  onClose={() => setShowPagar(false)}   onDone={carregar} />}
      {showReceber  && <ContaReceberModal onClose={() => setShowReceber(false)} onDone={carregar} />}
    </div>
  );
}

// ── Modais simples ─────────────────────────────────────────────────────────────

function CustoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", categoria: "outros", valor: "", data: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/financeiro", form); onDone(); onClose(); } catch { setSaving(false); }
  }
  return (
    <ModalBase title="Novo Custo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            {["aquisicao","alimentacao","saude","mao_de_obra","transporte","outros"].map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
          </select>
          <input type="number" required step="0.01" min="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="Valor (R$)"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <ModalBtns onClose={onClose} saving={saving} label="Salvar custo" />
      </form>
    </ModalBase>
  );
}

function ReceitaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", categoria: "outros", valor: "", data: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/financeiro2/receitas", form); onDone(); onClose(); } catch { setSaving(false); }
  }
  return (
    <ModalBase title="Nova Receita" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            {["venda_animais","venda_leite","arrendamento","servicos","subsidio","outros"].map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
          </select>
          <input type="number" required step="0.01" min="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="Valor (R$)"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <ModalBtns onClose={onClose} saving={saving} label="Salvar receita" />
      </form>
    </ModalBase>
  );
}

function ContaPagarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", categoria: "", valor: "", vencimento: "", recorrente: false });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/financeiro2/contas-pagar", form); onDone(); onClose(); } catch { setSaving(false); }
  }
  return (
    <ModalBase title="Nova Conta a Pagar" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" required step="0.01" min="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="Valor (R$)"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input type="date" required value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} placeholder="Categoria (ex: aluguel, ração, veterinário)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.recorrente} onChange={e => setForm({...form, recorrente: e.target.checked})} className="accent-green-600" />
          Conta recorrente (mensal)
        </label>
        <ModalBtns onClose={onClose} saving={saving} label="Salvar conta" />
      </form>
    </ModalBase>
  );
}

function ContaReceberModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", cliente_nome: "", valor: "", vencimento: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/financeiro2/contas-receber", form); onDone(); onClose(); } catch { setSaving(false); }
  }
  return (
    <ModalBase title="Nova Conta a Receber" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <input value={form.cliente_nome} onChange={e => setForm({...form, cliente_nome: e.target.value})} placeholder="Nome do cliente"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" required step="0.01" min="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="Valor (R$)"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input type="date" required value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <ModalBtns onClose={onClose} saving={saving} label="Salvar" />
      </form>
    </ModalBase>
  );
}

function ModalBase({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalBtns({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
      <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : label}</button>
    </div>
  );
}
