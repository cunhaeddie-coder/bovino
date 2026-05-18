"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Origem = {
  procedencia: string;
  total_animais: number;
  peso_medio: number | null;
};

export default function DesempenhoPorOrigemPage() {
  const [dados, setDados]   = useState<Origem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Origem[]>("/gestao/movimentacoes/por-origem")
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxAnimais = Math.max(...dados.map(d => d.total_animais), 1);
  const maxPeso    = Math.max(...dados.map(d => d.peso_medio ?? 0), 1);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/gestao/inteligencia" className="text-gray-400 hover:text-gray-600 text-sm">← Inteligência</Link>
        <h1 className="text-xl font-bold text-gray-900">🏡 Desempenho por Origem</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 Como funciona</p>
        <p className="text-xs text-amber-700">
          Esta análise mostra o desempenho dos animais agrupados pela fazenda ou criador de origem.
          Para usar, preencha o campo <strong>Procedência</strong> ao cadastrar animais no Rebanho
          (ex: "Fazenda Santa Cruz — MT").
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : dados.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
          <p className="text-4xl">🏡</p>
          <p className="text-gray-500 font-medium">Nenhuma procedência cadastrada</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Preencha o campo "Procedência" nos animais para rastrear quais fazendas/criadores fornecem os melhores animais.
          </p>
          <Link href="/gestao/animais"
            className="inline-block mt-2 text-green-700 text-sm font-semibold hover:underline">
            Ir para Rebanho →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{dados.length} origem{dados.length > 1 ? "s" : ""} cadastrada{dados.length > 1 ? "s" : ""} · ordenadas por quantidade</p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <th className="text-left px-5 py-3">Procedência</th>
                  <th className="text-right px-4 py-3">Animais</th>
                  <th className="text-right px-5 py-3">Peso médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dados.map(d => (
                  <tr key={d.procedencia} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{d.procedencia}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full"
                               style={{ width: `${(d.total_animais / maxAnimais) * 100}%` }} />
                        </div>
                        <span className="font-bold text-gray-800 w-8 text-right">{d.total_animais}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {d.peso_medio ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full"
                                 style={{ width: `${((d.peso_medio ?? 0) / maxPeso) * 100}%` }} />
                          </div>
                          <span className="font-bold text-amber-700 w-20 text-right">
                            {Number(d.peso_medio).toFixed(1)} kg
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sem pesagens</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Baseado nos animais ativos com campo Procedência preenchido
          </p>
        </>
      )}
    </div>
  );
}
