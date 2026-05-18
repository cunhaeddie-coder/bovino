"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  { element: "#mov-tabs", popover: { title: "↕️ Entradas e Saídas", description: "Visão consolidada de tudo que entrou e saiu do seu rebanho. Organize por Aquisições (compras), Saídas (vendas) e Perdas e Mortes.", side: "bottom" } },
  { element: "#mov-resumo", popover: { title: "📊 Resumo financeiro", description: "Total investido em compras e total recebido em vendas. Compare para calcular o resultado financeiro do período.", side: "bottom" } },
  { element: "#mov-tabela", popover: { title: "📋 Registros detalhados", description: "Cada linha mostra data, descrição, valor e lote associado. Os registros são gerados automaticamente a partir do módulo Financeiro.", side: "top" } },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtData = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR");

type Aba = "aquisicoes" | "saidas" | "perdas";

type Aquisicao = { id: number; descricao: string; valor: number; data: string; nota_fiscal: string | null; lote?: { nome: string } | null };
type Saida     = { id: number; descricao: string; valor: number; data: string; categoria: string; lote?: { nome: string } | null };
type Perda     = { id: number; brinco: string | null; nome: string | null; categoria: string; raca: string | null; status: string; updated_at: string };

type ResumoAq  = { total_registros: number; total_investido: number };
type ResumoSa  = { total_registros: number; total_recebido:  number };
type ResumoPe  = { status: string; total: number }[];

export default function MovimentacoesPage() {
  const [aba, setAba] = useState<Aba>("aquisicoes");

  const [aquisicoes, setAquisicoes] = useState<Aquisicao[]>([]);
  const [resumoAq, setResumoAq]     = useState<ResumoAq | null>(null);

  const [saidas, setSaidas]         = useState<Saida[]>([]);
  const [resumoSa, setResumoSa]     = useState<ResumoSa | null>(null);

  const [perdas, setPerdas]         = useState<Perda[]>([]);
  const [resumoPe, setResumoPe]     = useState<ResumoPe>([]);

  const [loading, setLoading] = useState(false);

  async function carregar(a: Aba) {
    setLoading(true);
    try {
      if (a === "aquisicoes") {
        const { data } = await api.get("/gestao/movimentacoes/aquisicoes");
        setAquisicoes(data.dados?.data ?? data.dados ?? []);
        setResumoAq(data.resumo);
      } else if (a === "saidas") {
        const { data } = await api.get("/gestao/movimentacoes/saidas");
        setSaidas(data.dados?.data ?? data.dados ?? []);
        setResumoSa(data.resumo);
      } else {
        const { data } = await api.get("/gestao/movimentacoes/perdas");
        setPerdas(data.dados?.data ?? data.dados ?? []);
        setResumoPe(data.resumo ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(aba); }, [aba]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">↕️ Entradas e Saídas</h1>

      {/* Tabs */}
      <div id="mov-tabs" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { k: "aquisicoes", label: "📥 Aquisições" },
          { k: "saidas",     label: "📤 Saídas"     },
          { k: "perdas",     label: "💀 Perdas e Mortes" },
        ] as const).map(({ k, label }) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${aba === k ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* AQUISIÇÕES */}
          {aba === "aquisicoes" && (
            <div className="space-y-3">
              {resumoAq && (resumoAq.total_registros ?? 0) > 0 && (
                <div id="mov-resumo" className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{resumoAq.total_registros}</p>
                    <p className="text-xs text-blue-600">registros de compra</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{fmt(resumoAq.total_investido ?? 0)}</p>
                    <p className="text-xs text-red-500">total investido</p>
                  </div>
                </div>
              )}
              {aquisicoes.length === 0 ? (
                <EmptyState icon="📥" label="Nenhuma aquisição registrada" sub='Registre compras de animais em Financeiro → Custos com categoria "Aquisição"' />
              ) : (
                <div id="mov-tabela">
                  <Table>
                    <thead>
                      <TR header>
                        <TH>Descrição</TH><TH>Lote</TH><TH>Data</TH><TH right>Valor</TH>
                      </TR>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {aquisicoes.map(a => (
                        <TR key={a.id}>
                          <TD>
                            <p className="font-medium text-gray-800">{a.descricao}</p>
                            {a.nota_fiscal && <p className="text-[10px] text-gray-400">NF: {a.nota_fiscal}</p>}
                          </TD>
                          <TD><span className="text-gray-500 text-xs">{a.lote?.nome ?? "—"}</span></TD>
                          <TD><span className="text-gray-500 text-xs">{fmtData(a.data)}</span></TD>
                          <TD right><span className="font-bold text-red-600">{fmt(a.valor)}</span></TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* SAÍDAS */}
          {aba === "saidas" && (
            <div className="space-y-3">
              {resumoSa && (resumoSa.total_registros ?? 0) > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{resumoSa.total_registros}</p>
                    <p className="text-xs text-blue-600">registros de venda</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{fmt(resumoSa.total_recebido ?? 0)}</p>
                    <p className="text-xs text-green-600">total recebido</p>
                  </div>
                </div>
              )}
              {saidas.length === 0 ? (
                <EmptyState icon="📤" label="Nenhuma saída registrada" sub='Registre vendas em Financeiro → Receitas com categoria "Venda de Animais"' />
              ) : (
                <Table>
                  <thead>
                    <TR header>
                      <TH>Descrição</TH><TH>Lote</TH><TH>Data</TH><TH right>Valor</TH>
                    </TR>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {saidas.map(s => (
                      <TR key={s.id}>
                        <TD><p className="font-medium text-gray-800">{s.descricao}</p></TD>
                        <TD><span className="text-gray-500 text-xs">{s.lote?.nome ?? "—"}</span></TD>
                        <TD><span className="text-gray-500 text-xs">{fmtData(s.data)}</span></TD>
                        <TD right><span className="font-bold text-green-700">{fmt(s.valor)}</span></TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}

          {/* PERDAS */}
          {aba === "perdas" && (
            <div className="space-y-3">
              {resumoPe.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {resumoPe.map(r => (
                    <div key={r.status} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-2xl font-bold text-gray-700">{r.total}</p>
                      <p className="text-xs text-gray-500 capitalize">{r.status === "morto" ? "Mortes" : "Descartes"}</p>
                    </div>
                  ))}
                </div>
              )}
              {perdas.length === 0 ? (
                <EmptyState icon="✅" label="Nenhuma perda ou morte registrada" sub="Animais com status Morto ou Descartado aparecem aqui" />
              ) : (
                <Table>
                  <thead>
                    <TR header>
                      <TH>Animal</TH><TH>Categoria</TH><TH>Status</TH><TH right>Data</TH>
                    </TR>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {perdas.map(p => (
                      <TR key={p.id}>
                        <TD>
                          <p className="font-medium text-gray-800">{p.nome ?? p.brinco ?? `#${p.id}`}</p>
                          {p.raca && <p className="text-[10px] text-gray-400">{p.raca}</p>}
                        </TD>
                        <TD><span className="text-gray-500 text-xs capitalize">{p.categoria?.replace("_"," ")}</span></TD>
                        <TD>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === "morto" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                            {p.status === "morto" ? "Morte" : "Descarte"}
                          </span>
                        </TD>
                        <TD right><span className="text-gray-500 text-xs">{fmtData(p.updated_at)}</span></TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </>
      )}
      <TourButton tourKey="movimentacoes" steps={TOUR_STEPS} />
    </div>
  );
}

// ── Helpers de layout ─────────────────────────────────────────────────────────

function EmptyState({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-500 font-medium">{label}</p>
      <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">{sub}</p>
    </div>
  );
}
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">{children}</table></div>
    </div>
  );
}
function TR({ children, header }: { children: React.ReactNode; header?: boolean }) {
  return <tr className={header ? "bg-gray-50 border-b border-gray-100" : "hover:bg-gray-50"}>{children}</tr>;
}
function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function TD({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`py-3 px-4 ${right ? "text-right" : ""}`}>{children}</td>;
}
