"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { temPlano } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Cotacao } from "@/lib/types";
import Link from "next/link";

const TIPO_LABEL = { boi_gordo: "Boi Gordo", bezerro: "Bezerro", vaca: "Vaca" } as const;
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type B3Dados = {
  contrato: string;
  vencimento: string | null;
  preco: number;
  ajuste: number;
  minimo: number;
  maximo: number;
  bid: number;
  ask: number;
  contratos_abertos: number;
  variacao: number;
  variacao_pct: number;
  pregao_aberto: boolean;
  atualizado: string;
};

function B3Card({ dados, loading }: { dados: B3Dados | null; loading: boolean }) {
  if (loading) return <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse h-48" />;

  const positivo = dados ? dados.variacao >= 0 : false;
  const venc = dados?.vencimento
    ? new Date(dados.vencimento).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    : null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 col-span-1 sm:col-span-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">B3</span>
            <p className="text-sm font-semibold text-gray-700">Boi Gordo Futuro</p>
            {dados?.contrato && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {dados.contrato} {venc ? `· vence ${venc}` : ""}
              </span>
            )}
          </div>
          {dados ? (
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-4xl font-extrabold text-blue-700">{fmt(dados.preco)}<span className="text-base text-gray-400 font-normal"> /@</span></p>
                {!dados.pregao_aberto && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1 inline-block">
                    🔒 Pregão fechado · exibindo fechamento anterior
                  </span>
                )}
              </div>
              {dados.pregao_aberto && (
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${positivo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {positivo ? "▲" : "▼"} {Math.abs(dados.variacao_pct).toFixed(2)}% ({positivo ? "+" : ""}{fmt(dados.variacao)})
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 mt-2 text-sm">Dados indisponíveis no momento</p>
          )}
        </div>

        {dados && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
            {[
              ["Ajuste anterior", fmt(dados.ajuste)],
              ["Lim. inferior", fmt(dados.minimo)],
              ["Lim. superior", fmt(dados.maximo)],
              dados.bid > 0 ? ["Compra / Venda", `${fmt(dados.bid)} / ${fmt(dados.ask)}`] : ["Contratos abertos", dados.contratos_abertos.toLocaleString("pt-BR")],
            ].map(([l, v]) => (
              <div key={l as string} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-gray-400 text-[10px]">{l}</p>
                <p className="font-semibold text-gray-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {dados && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
          <span>Contratos abertos: <strong className="text-gray-600">{dados.contratos_abertos.toLocaleString("pt-BR")}</strong></span>
          <span>Fonte: B3 · {new Date(dados.atualizado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  );
}

export default function CotacoesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [b3, setB3] = useState<B3Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingB3, setLoadingB3] = useState(true);
  const [estado, setEstado] = useState("");
  const [cotacoesEstado, setCotacoesEstado] = useState<Cotacao[]>([]);
  const [loadingEstado, setLoadingEstado] = useState(false);

  const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

  useEffect(() => {
    if (!user) { router.replace("/login?next=/cotacoes"); return; }
    if (!temPlano(user)) { router.replace("/planos"); return; }

    api.get("/cotacoes/ultima")
      .then(({ data }) => setCotacoes(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get<B3Dados>("/cotacoes/b3")
      .then(({ data }) => setB3(data))
      .catch(() => {})
      .finally(() => setLoadingB3(false));
  }, [user]);

  useEffect(() => {
    if (!estado) { setCotacoesEstado([]); return; }
    setLoadingEstado(true);
    api.get<Cotacao[]>(`/cotacoes?tipo=boi_gordo&estado=${estado}`)
      .then(({ data }) => setCotacoesEstado(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingEstado(false));
  }, [estado]);

  if (!user || !temPlano(user)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Cotações do Boi</h1>

        {/* B3 — Futuro */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mercado Futuro · B3</h2>
          <B3Card dados={b3} loading={loadingB3} />
        </div>

        {/* CEPEA — À vista */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mercado Físico · CEPEA/ESALQ</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["boi_gordo", "bezerro", "vaca"] as const).map((tipo) => {
                const c = cotacoes[tipo];
                return (
                  <div key={tipo} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">{TIPO_LABEL[tipo]}</p>
                    {c ? (
                      <>
                        <p className="text-3xl font-bold text-green-700 mt-1">{fmt(c.preco_arroba)}</p>
                        <p className="text-xs text-gray-400 mt-1">por arroba · {c.fonte}</p>
                        <p className="text-xs text-gray-400">{new Date(c.referencia_em).toLocaleDateString("pt-BR")}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 mt-2 text-sm">Sem dados</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Histórico por estado */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Histórico por Estado</h2>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione um estado</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          {estado && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingEstado ? (
                <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
              ) : cotacoesEstado.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Sem dados para {estado}.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                      <th className="text-left px-4 py-3">Data</th>
                      <th className="text-left px-4 py-3">Preço (R$/@)</th>
                      <th className="text-left px-4 py-3">Fonte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cotacoesEstado.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{new Date(c.referencia_em).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 font-bold text-green-700">{fmt(c.preco_arroba)}</td>
                        <td className="px-4 py-3 text-gray-400">{c.fonte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Cotação B3 atualizada a cada 15 min · Dados físicos CEPEA/ESALQ ·{" "}
          <Link href="/inteligencia" className="text-green-700 hover:underline">Ver inteligência de mercado</Link>
        </p>
      </main>
    </div>
  );
}
