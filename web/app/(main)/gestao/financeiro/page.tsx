"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#fin-header",
    popover: {
      title: "📅 Período financeiro",
      description: "Selecione o mês e ano para ver o resumo financeiro do período. Os dados de receitas, custos e contas são filtrados automaticamente.",
      side: "bottom",
    },
  },
  {
    element: "#fin-abas",
    popover: {
      title: "📑 Módulos financeiros",
      description: "Dashboard: resumo geral · Receitas: entradas de dinheiro · Custos: gastos da fazenda · A Pagar: contas em aberto · A Receber: valores a cobrar.",
      side: "bottom",
    },
  },
  {
    popover: {
      title: "💡 Dica",
      description: "No Dashboard você vê o gráfico de custos por categoria do ano inteiro. Use as abas A Pagar e A Receber para controlar vencimentos e fluxo de caixa.",
    },
  },
];

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
type LoteFinanceiro = {
  id: number; nome: string; raca: string | null; categoria: string;
  qtd_cabecas: number; total_custos: number; total_receitas: number;
  resultado: number; custo_por_cabeca: number;
  custos_por_categoria: Record<string, number>;
};
type Lancamento = { id: number; tipo: "receita" | "despesa"; categoria: string; descricao: string | null; valor: number; data: string };
type ResumoFiscal = { total_receitas: number; total_despesas: number; saldo: number };
type ContadorAcesso = { ativo: boolean; token: string | null; tem_pin: boolean; expira_em: string | null };

const CATS_RECEITA = ["venda_gado","venda_leite","arrendamento","outros_receita"];
const CATS_DESPESA = ["alimentacao","sanidade","funcionarios","combustivel","manutencao","pastagem","impostos","outros_despesa"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_COR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700", pago: "bg-green-100 text-green-700",
  recebido: "bg-green-100 text-green-700", vencido: "bg-red-100 text-red-700", cancelado: "bg-gray-100 text-gray-500",
};

export default function FinanceiroPage() {
  const [aba, setAba]               = useState<"dashboard"|"custos"|"receitas"|"pagar"|"receber"|"lotes"|"fiscal"|"contador">("dashboard");
  const [resumo, setResumo]         = useState<Resumo2 | null>(null);
  const [resumoAntigo, setResumoAntigo] = useState<ResumoAntigo | null>(null);
  const [custos, setCustos]         = useState<Custo[]>([]);
  const [receitas, setReceitas]     = useState<Receita[]>([]);
  const [contasPagar, setContasPagar]   = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loteRelatorio, setLoteRelatorio] = useState<LoteFinanceiro[]>([]);
  const [showCusto, setShowCusto]   = useState(false);
  const [showReceita, setShowReceita]   = useState(false);
  const [showPagar, setShowPagar]       = useState(false);
  const [showReceber, setShowReceber]   = useState(false);
  const [showLancamento, setShowLancamento] = useState(false);
  const [lancamentos, setLancamentos]   = useState<Lancamento[]>([]);
  const [resumoFiscal, setResumoFiscal] = useState<ResumoFiscal | null>(null);
  const [filtroBusca, setFiltroBusca]   = useState("");
  const [filtroTipo, setFiltroTipo]     = useState("");
  const [contadorAcesso, setContadorAcesso] = useState<ContadorAcesso | null>(null);
  const [contadorForm, setContadorForm] = useState({ pin: "", expira_em: "", expira_dias: "30" });
  const [contadorSalvando, setContadorSalvando] = useState(false);
  const [contadorCopiado, setContadorCopiado]   = useState(false);
  const [mes, setMes]   = useState(new Date().getMonth() + 1);
  const [ano, setAno]   = useState(new Date().getFullYear());

  function toArray<T>(v: unknown): T[] {
    if (Array.isArray(v)) return v as T[];
    if (v && typeof v === "object" && Array.isArray((v as any).data)) return (v as any).data as T[];
    return [];
  }

  async function carregar() {
    setLoading(true);
    const [r2, rv, ct, cpag, crec, custosData, lotes] = await Promise.all([
      api.get(`/gestao/financeiro2/resumo?mes=${mes}&ano=${ano}`).then(r => r.data).catch(() => null),
      api.get("/gestao/financeiro/resumo").then(r => r.data).catch(() => null),
      api.get("/gestao/financeiro").then(r => r.data).catch(() => []),
      api.get("/gestao/financeiro2/contas-pagar").then(r => r.data?.data ?? r.data).catch(() => []),
      api.get("/gestao/financeiro2/contas-receber").then(r => r.data?.data ?? r.data).catch(() => []),
      api.get("/gestao/financeiro2/receitas").then(r => r.data?.data ?? r.data).catch(() => []),
      api.get("/gestao/financeiro/por-lote").then(r => r.data).catch(() => []),
    ]);
    setResumo(r2);
    setResumoAntigo(rv);
    setCustos(toArray(ct));
    setContasPagar(toArray(cpag));
    setContasReceber(toArray(crec));
    setReceitas(toArray(custosData));
    setLoteRelatorio(Array.isArray(lotes) ? lotes : []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [mes, ano]);

  async function carregarFiscal() {
    const params = filtroTipo ? `?tipo=${filtroTipo}` : "";
    const [r, l] = await Promise.all([
      api.get("/gestao/fiscal/resumo").then(r => r.data).catch(() => null),
      api.get(`/gestao/fiscal${params}`).then(r => r.data?.data ?? r.data).catch(() => []),
    ]);
    setResumoFiscal(r);
    setLancamentos(Array.isArray(l) ? l : []);
  }

  async function carregarContador() {
    const d = await api.get("/gestao/fiscal/contador-acesso").then(r => r.data).catch(() => null);
    setContadorAcesso(d);
  }

  useEffect(() => { if (aba === "fiscal")   carregarFiscal();   }, [aba, filtroTipo]);
  useEffect(() => { if (aba === "contador") carregarContador(); }, [aba]);

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <div className="space-y-5">
      <div id="fin-header" className="flex items-center justify-between">
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
      <div id="fin-abas" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { k: "dashboard", label: "📊 Dashboard" },
          { k: "receitas",  label: "💚 Receitas" },
          { k: "custos",    label: "💸 Custos" },
          { k: "pagar",     label: `📤 A Pagar${resumo?.contas_vencidas ? ` ⚠️${resumo.contas_vencidas}` : ""}` },
          { k: "receber",   label: "📥 A Receber" },
          { k: "lotes",     label: "🗂️ Por Lote" },
          { k: "fiscal",    label: "📋 Fiscal" },
          { k: "contador",  label: "🧾 Contador" },
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
      {/* POR LOTE */}
      {aba === "lotes" && (
        <div className="space-y-4">
          {loteRelatorio.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-3xl mb-3">🗂️</p>
              <p className="text-gray-500">Nenhum lote com movimentação financeira</p>
              <p className="text-gray-400 text-sm mt-1">Registre custos ou receitas vinculando a um lote</p>
            </div>
          ) : (
            <>
              {/* Totais consolidados */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total custos",   value: loteRelatorio.reduce((s,l) => s + l.total_custos,   0), cor: "text-red-600"   },
                  { label: "Total receitas", value: loteRelatorio.reduce((s,l) => s + l.total_receitas, 0), cor: "text-green-700" },
                  { label: "Resultado",      value: loteRelatorio.reduce((s,l) => s + l.resultado,      0), cor: loteRelatorio.reduce((s,l) => s + l.resultado, 0) >= 0 ? "text-green-700" : "text-red-600" },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className={`text-xl font-bold ${k.cor}`}>{fmt(k.value)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Cards por lote */}
              {loteRelatorio.map(lote => {
                const positivo = lote.resultado >= 0;
                return (
                  <div key={lote.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${positivo ? "border-green-100" : "border-red-100"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-800">{lote.nome}</p>
                        <p className="text-xs text-gray-400">{lote.raca ?? "—"} · {lote.qtd_cabecas} cab. · {lote.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-extrabold ${positivo ? "text-green-700" : "text-red-600"}`}>
                          {positivo ? "+" : ""}{fmt(lote.resultado)}
                        </p>
                        <p className="text-[10px] text-gray-400">resultado</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-xs text-red-500 font-semibold">Custos</p>
                        <p className="font-bold text-red-700">{fmt(lote.total_custos)}</p>
                        {lote.qtd_cabecas > 0 && (
                          <p className="text-[10px] text-red-400">{fmt(lote.custo_por_cabeca)}/cab</p>
                        )}
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs text-green-600 font-semibold">Receitas</p>
                        <p className="font-bold text-green-700">{fmt(lote.total_receitas)}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${positivo ? "bg-green-50" : "bg-red-50"}`}>
                        <p className={`text-xs font-semibold ${positivo ? "text-green-600" : "text-red-500"}`}>Margem</p>
                        <p className={`font-bold ${positivo ? "text-green-700" : "text-red-600"}`}>
                          {lote.total_receitas > 0 ? Math.round((lote.resultado / lote.total_receitas) * 100) : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Custos por categoria */}
                    {Object.keys(lote.custos_por_categoria).length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Custos por categoria</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(lote.custos_por_categoria).map(([cat, val]) => (
                            <span key={cat} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {cat.replace("_", " ")}: {fmt(val as number)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* FISCAL */}
      {aba === "fiscal" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Receitas",  value: fmt(resumoFiscal?.total_receitas ?? 0), icon: "💚", cor: "text-green-700" },
              { label: "Despesas",  value: fmt(resumoFiscal?.total_despesas ?? 0), icon: "💸", cor: "text-red-600" },
              { label: "Saldo",     value: fmt(resumoFiscal?.saldo ?? 0),           icon: (resumoFiscal?.saldo ?? 0) >= 0 ? "📈" : "📉", cor: (resumoFiscal?.saldo ?? 0) >= 0 ? "text-green-700" : "text-red-600" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xl mb-1">{k.icon}</p>
                <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Filtros + botões */}
          <div className="flex flex-wrap gap-2 items-center">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="">Todos os tipos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
            <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} placeholder="Buscar descrição..."
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 flex-1 min-w-40" />
            <a href="/api/v1/gestao/fiscal/exportar" target="_blank"
              className="text-xs border border-gray-200 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
              ⬇ Exportar CSV
            </a>
            <button onClick={() => setShowLancamento(true)}
              className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">
              + Novo lançamento
            </button>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-3 py-3">Categoria</th>
                <th className="text-left px-3 py-3">Data</th>
                <th className="text-right px-5 py-3">Valor</th>
                <th className="px-3 py-3" />
              </tr></thead>
              <tbody>
                {lancamentos
                  .filter(l => !filtroBusca || (l.descricao ?? "").toLowerCase().includes(filtroBusca.toLowerCase()))
                  .map(l => (
                    <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-2 ${l.tipo === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {l.tipo === "receita" ? "↑" : "↓"}
                        </span>
                        {l.descricao || <span className="text-gray-400 italic">Sem descrição</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs capitalize">{l.categoria.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3 text-gray-400 text-xs">{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                      <td className={`px-5 py-3 text-right font-bold ${l.tipo === "receita" ? "text-green-700" : "text-red-600"}`}>
                        {l.tipo === "receita" ? "+" : "-"}{fmt(Number(l.valor))}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={async () => { await api.delete(`/gestao/fiscal/${l.id}`); carregarFiscal(); }}
                          className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                      </td>
                    </tr>
                  ))}
                {lancamentos.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum lançamento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTADOR */}
      {aba === "contador" && (
        <div className="max-w-xl space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧾</span>
              <div>
                <h2 className="font-bold text-gray-800">Acesso do Contador</h2>
                <p className="text-xs text-gray-500">Gere um link seguro para seu contador acessar os dados fiscais</p>
              </div>
            </div>

            {contadorAcesso?.ativo && contadorAcesso.token && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">Link ativo</p>
                <div className="flex gap-2 items-center">
                  <code className="text-xs text-gray-700 flex-1 truncate">{`${typeof window !== "undefined" ? window.location.origin : ""}/contador/${contadorAcesso.token}`}</code>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/contador/${contadorAcesso.token}`);
                    setContadorCopiado(true); setTimeout(() => setContadorCopiado(false), 2000);
                  }} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg">
                    {contadorCopiado ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                {contadorAcesso.expira_em && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Expira em: {new Date(contadorAcesso.expira_em).toLocaleDateString("pt-BR")}
                    {contadorAcesso.tem_pin && " · PIN ativo ✓"}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">PIN de acesso (opcional)</label>
                <input type="password" value={contadorForm.pin} onChange={e => setContadorForm(f => ({ ...f, pin: e.target.value }))}
                  placeholder="Deixe em branco para sem PIN" maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Validade do link</label>
                <select value={contadorForm.expira_dias} onChange={e => setContadorForm(f => ({ ...f, expira_dias: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                  <option value="365">1 ano</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setContadorSalvando(true);
                    const expira = new Date(); expira.setDate(expira.getDate() + parseInt(contadorForm.expira_dias));
                    await api.post("/gestao/fiscal/contador-acesso", {
                      pin: contadorForm.pin || undefined,
                      expira_em: expira.toISOString().split("T")[0],
                    }).catch(() => null);
                    await carregarContador();
                    setContadorSalvando(false);
                  }}
                  disabled={contadorSalvando}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {contadorSalvando ? "Salvando..." : contadorAcesso?.ativo ? "Atualizar link" : "Gerar link"}
                </button>
                {contadorAcesso?.ativo && (
                  <button
                    onClick={async () => {
                      if (!confirm("Revogar acesso do contador?")) return;
                      await api.delete("/gestao/fiscal/contador-acesso").catch(() => null);
                      await carregarContador();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold">
                    Revogar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">🔒 Como funciona</p>
            <ul className="space-y-0.5 text-xs list-disc list-inside text-amber-700">
              <li>O contador acessa apenas dados fiscais e inventário do rebanho</li>
              <li>Com PIN: 5 tentativas erradas bloqueiam o acesso por 1 hora</li>
              <li>O link expira automaticamente na data configurada</li>
              <li>Você pode revogar o acesso a qualquer momento</li>
            </ul>
          </div>
        </div>
      )}

      {showCusto    && <CustoModal    onClose={() => setShowCusto(false)}    onDone={carregar} />}
      {showReceita  && <ReceitaModal  onClose={() => setShowReceita(false)}  onDone={carregar} />}
      {showPagar    && <ContaPagarModal  onClose={() => setShowPagar(false)}   onDone={carregar} />}
      {showReceber  && <ContaReceberModal onClose={() => setShowReceber(false)} onDone={carregar} />}
      {showLancamento && <LancamentoFiscalModal onClose={() => setShowLancamento(false)} onDone={carregarFiscal} />}
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

function LancamentoFiscalModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ tipo: "receita", categoria: "venda_gado", valor: "", data: new Date().toISOString().split("T")[0], descricao: "" });
  const [saving, setSaving] = useState(false);
  const cats = form.tipo === "receita" ? CATS_RECEITA : CATS_DESPESA;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/fiscal", form); onDone(); onClose(); } catch { setSaving(false); }
  }
  return (
    <ModalBase title="Novo Lançamento Fiscal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setForm(f => ({ ...f, tipo: "receita", categoria: "venda_gado" }))}
            className={`py-2 rounded-xl text-sm font-semibold border transition ${form.tipo === "receita" ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600"}`}>
            ↑ Receita
          </button>
          <button type="button" onClick={() => setForm(f => ({ ...f, tipo: "despesa", categoria: "alimentacao" }))}
            className={`py-2 rounded-xl text-sm font-semibold border transition ${form.tipo === "despesa" ? "bg-red-500 text-white border-red-500" : "border-gray-200 text-gray-600"}`}>
            ↓ Despesa
          </button>
        </div>
        <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
          {cats.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" required step="0.01" min="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="Valor (R$)"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        <ModalBtns onClose={onClose} saving={saving} label="Salvar lançamento" />
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
      <TourButton tourKey="gestao-financeiro" steps={TOUR_STEPS} />
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
