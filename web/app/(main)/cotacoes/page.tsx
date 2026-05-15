"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { temPlano } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Cotacao } from "@/lib/types";
import Link from "next/link";
import dynamic from "next/dynamic";

const B3Chart = dynamic(() => import("./B3Chart"), { ssr: false });

const TIPO_LABEL = { boi_gordo: "Boi Gordo", bezerro: "Bezerro", vaca: "Vaca" } as const;
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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

export type B3Ponto = { referencia_em: string; preco_arroba: number };

type Periodo = "1s" | "1m" | "3m" | "1a";

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "1s", label: "1S" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "1a", label: "1A" },
];

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

// ─── B3 Card (compact) ──────────────────────────────────────────────────────
function B3Card({ dados, loading }: { dados: B3Dados | null; loading: boolean }) {
  if (loading) return <div className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse h-32" />;

  const positivo = dados ? dados.variacao >= 0 : false;
  const venc = dados?.vencimento
    ? new Date(dados.vencimento).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    : null;

  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">B3</span>
        <span className="text-xs font-semibold text-gray-700">Boi Gordo Futuro</span>
        {dados?.contrato && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {dados.contrato}{venc ? ` · vence ${venc}` : ""}
          </span>
        )}
      </div>

      {dados ? (
        <>
          {/* Price row */}
          <div className="flex items-end gap-2 flex-wrap mb-3">
            <p className="text-3xl font-extrabold text-blue-700 leading-none">
              {fmt(dados.preco)}<span className="text-sm text-gray-400 font-normal"> /@</span>
            </p>
            {dados.pregao_aberto ? (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${positivo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {positivo ? "▲" : "▼"} {Math.abs(dados.variacao_pct).toFixed(2)}% ({positivo ? "+" : ""}{fmt(dados.variacao)})
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                🔒 Pregão fechado
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            {[
              ["Ajuste ant.", fmt(dados.ajuste)],
              ["Lim. inf.", fmt(dados.minimo)],
              ["Lim. sup.", fmt(dados.maximo)],
              dados.bid > 0
                ? ["Compra/Venda", `${fmt(dados.bid)} / ${fmt(dados.ask)}`]
                : ["Em aberto", dados.contratos_abertos.toLocaleString("pt-BR")],
            ].map(([l, v]) => (
              <div key={l as string} className="bg-gray-50 rounded-lg px-2 py-1.5">
                <p className="text-gray-400">{l}</p>
                <p className="font-semibold text-gray-700 mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 mt-2 text-right">
            {dados.contratos_abertos.toLocaleString("pt-BR")} contratos abertos ·{" "}
            {new Date(dados.atualizado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </>
      ) : (
        <p className="text-gray-400 text-sm">Dados indisponíveis no momento</p>
      )}
    </div>
  );
}

// ─── B3 Chart Section ────────────────────────────────────────────────────────
function B3ChartSection() {
  const [periodo, setPeriodo] = useState<Periodo>("1m");
  const [historico, setHistorico] = useState<B3Ponto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<B3Ponto[]>(`/cotacoes/b3/historico?periodo=${periodo}`)
      .then(({ data }) => setHistorico(data))
      .catch(() => setHistorico([]))
      .finally(() => setLoading(false));
  }, [periodo]);

  return (
    <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className="text-xs font-semibold text-gray-600">Histórico BGI · Ajuste Diário</p>
        <div className="flex gap-1">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                periodo === p.key ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-300 text-xs animate-pulse">
          Carregando...
        </div>
      ) : historico.length < 3 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-1.5 text-center px-4">
          <span className="text-xl">📈</span>
          <p className="text-xs font-semibold text-gray-500">Histórico sendo coletado</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Dados capturados diariamente às 13h e 19h.<br />O gráfico estará disponível em alguns dias.
          </p>
        </div>
      ) : (
        <B3Chart dados={historico} height={160} />
      )}

      <p className="text-[10px] text-gray-400 text-right px-4 pb-2">Ajuste diário oficial · B3 BGI</p>
    </div>
  );
}

// ─── CEPEA Section ──────────────────────────────────────────────────────────
function CepeaSection({ cotacoes, loading }: { cotacoes: Record<string, Cotacao>; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mercado Físico · CEPEA/ESALQ</p>
      </div>
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 animate-pulse h-14 bg-white" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {(["boi_gordo", "bezerro", "vaca"] as const).map((tipo) => {
            const c = cotacoes[tipo];
            return (
              <div key={tipo} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs text-gray-500">{TIPO_LABEL[tipo]}</p>
                  {c && (
                    <p className="text-[10px] text-gray-400">
                      {new Date(c.referencia_em).toLocaleDateString("pt-BR")} · {c.fonte}
                    </p>
                  )}
                </div>
                {c ? (
                  <p className="text-lg font-bold text-green-700">{fmt(c.preco_arroba)}<span className="text-xs text-gray-400 font-normal"> /@</span></p>
                ) : (
                  <p className="text-xs text-gray-400">Sem dados</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Estado Section ──────────────────────────────────────────────────────────
function EstadoSection() {
  const [estado, setEstado] = useState("");
  const [cotacoesEstado, setCotacoesEstado] = useState<Cotacao[]>([]);
  const [loadingEstado, setLoadingEstado] = useState(false);

  useEffect(() => {
    if (!estado) { setCotacoesEstado([]); return; }
    setLoadingEstado(true);
    api.get<Cotacao[]>(`/cotacoes?tipo=boi_gordo&estado=${estado}`)
      .then(({ data }) => setCotacoesEstado(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingEstado(false));
  }, [estado]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-1">Histórico por Estado</p>
        <select
          value={estado}
          onChange={e => setEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecione</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>

      {!estado ? (
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">
          Selecione um estado para ver o histórico
        </div>
      ) : loadingEstado ? (
        <div className="h-24 flex items-center justify-center text-xs text-gray-400 animate-pulse">Carregando...</div>
      ) : cotacoesEstado.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">Sem dados para {estado}.</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-gray-50">
              <th className="text-left px-4 py-2">Data</th>
              <th className="text-right px-4 py-2">R$/@</th>
              <th className="text-right px-4 py-2">Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cotacoesEstado.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{new Date(c.referencia_em).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 font-bold text-green-700 text-right">{fmt(c.preco_arroba)}</td>
                <td className="px-4 py-2 text-gray-400 text-right">{c.fonte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function CotacoesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [b3, setB3] = useState<B3Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingB3, setLoadingB3] = useState(true);

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

  if (!user || !temPlano(user)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* Page title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Cotações do Boi</h1>
          <Link href="/inteligencia" className="text-xs text-green-700 hover:underline hidden sm:block">
            Ver inteligência de mercado →
          </Link>
        </div>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT: B3 Futuro (2/3) */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mercado Futuro · B3</p>
            <B3Card dados={b3} loading={loadingB3} />
            <B3ChartSection />
          </div>

          {/* RIGHT: Físico + Estado (1/3) */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide hidden lg:block">&nbsp;</p>
            <CepeaSection cotacoes={cotacoes} loading={loading} />
            <EstadoSection />
          </div>

        </div>

        <p className="text-[10px] text-gray-400 text-center mt-4">
          B3 atualizado a cada 15 min · CEPEA/ESALQ ·{" "}
          <Link href="/inteligencia" className="text-green-700 hover:underline sm:hidden">Inteligência de mercado</Link>
        </p>
      </main>
    </div>
  );
}
