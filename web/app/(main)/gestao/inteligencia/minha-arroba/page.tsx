"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDelta = (v: number) =>
  `${v >= 0 ? "+" : ""}${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)}`;

type Lote = {
  id: number; nome: string; categoria: string; raca: string | null;
  status: string; preco_arroba: number;
  vs_b3: number | null; vs_b3_pct: number | null;
  vs_cepea: number | null; vs_cepea_pct: number | null;
};

type Resposta = {
  mercado: { b3: number | null; cepea: number | null };
  lotes: Lote[];
};

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível", reservado: "Reservado",
  vendido: "Vendido", interno: "Interno",
};

export default function MinhaArrobaPage() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Resposta>("/gestao/analises/minha-arroba")
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const m = dados?.mercado;
  const lotes = dados?.lotes ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/gestao/inteligencia" className="text-gray-400 hover:text-gray-600 text-sm">← Inteligência</Link>
        <h1 className="text-xl font-bold text-gray-900">💹 Minha @ vs Mercado</h1>
      </div>

      {/* Referências de mercado */}
      {m && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "BGI Futuro · B3",      value: m.b3,    cor: "text-blue-700",  bg: "bg-blue-50 border-blue-200"  },
            { label: "Boi Gordo · CEPEA",    value: m.cepea, cor: "text-green-700", bg: "bg-green-50 border-green-200"},
          ].map(ref => (
            <div key={ref.label} className={`rounded-xl border p-3 ${ref.bg}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{ref.label}</p>
              <p className={`text-xl font-extrabold mt-0.5 ${ref.cor}`}>
                {ref.value ? `${fmt(ref.value)}/@` : <span className="text-gray-400 text-sm">Sem dados</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : lotes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">💹</p>
          <p className="text-gray-500 font-medium">Nenhum lote com preço definido</p>
          <p className="text-gray-400 text-sm mt-1">Defina o preço por arroba nos seus lotes para ver a comparação com o mercado</p>
          <Link href="/gestao/lotes" className="mt-4 inline-block text-green-700 text-sm font-semibold hover:underline">
            Ir para Lotes →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{lotes.length} lote{lotes.length > 1 ? "s" : ""} com preço cadastrado · ordenados por preço</p>

          {lotes.map(lote => {
            const refPct  = lote.vs_b3_pct ?? lote.vs_cepea_pct;
            const refVal  = lote.vs_b3    ?? lote.vs_cepea;
            const acima   = (refPct ?? 0) >= 0;

            return (
              <div key={lote.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${acima ? "border-green-100" : "border-red-100"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {/* Lote info */}
                  <div>
                    <p className="font-bold text-gray-900">{lote.nome}</p>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{STATUS_LABEL[lote.status] ?? lote.status}</span>
                      {lote.raca && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{lote.raca}</span>}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{lote.categoria.replace("_"," ")}</span>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-gray-900">{fmt(lote.preco_arroba)}<span className="text-xs text-gray-400 font-normal">/@</span></p>
                    {refPct != null && (
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${acima ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {acima ? "▲" : "▼"} {Math.abs(refPct).toFixed(1)}% {acima ? "acima" : "abaixo"} do mercado
                      </span>
                    )}
                  </div>
                </div>

                {/* Comparativos */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { label: "vs B3",    val: lote.vs_b3,    pct: lote.vs_b3_pct    },
                    { label: "vs CEPEA", val: lote.vs_cepea, pct: lote.vs_cepea_pct },
                  ].map(({ label, val, pct }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400">{label}</p>
                      {val != null ? (
                        <>
                          <p className={`text-sm font-bold ${val >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtDelta(val)}/@</p>
                          <p className={`text-[10px] ${val >= 0 ? "text-green-500" : "text-red-400"}`}>{pct != null ? `${val >= 0 ? "+" : ""}${pct}%` : ""}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Sem dados</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Preços B3 atualizados a cada 15 min · CEPEA referente à última cotação disponível
      </p>
    </div>
  );
}
