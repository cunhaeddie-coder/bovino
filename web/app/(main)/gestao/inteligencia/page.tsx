"use client";

import Link from "next/link";
import { TrendingUp, BarChart2, MapPin, Zap } from "lucide-react";

const FERRAMENTAS = [
  {
    href: "/gestao/inteligencia/projecao-venda",
    icon: "📊",
    titulo: "Projeção de Venda",
    desc: "Simule o resultado financeiro de vender um lote: receita, lucro, preço de equilíbrio e preço para atingir sua meta.",
    badge: "Novo",
    cor: "border-blue-200 hover:border-blue-400",
    badgeCor: "bg-blue-100 text-blue-700",
  },
  {
    href: "/inteligencia",
    icon: "🗺️",
    titulo: "Mapa de Demanda",
    desc: "Veja onde estão os compradores ativos no Brasil e as regiões com maior demanda por tipo de gado.",
    cor: "border-gray-200 hover:border-green-400",
  },
  {
    href: "/inteligencia/alertas",
    icon: "🔔",
    titulo: "Alertas de Demanda",
    desc: "Configure alertas para ser notificado quando surgir demanda para o tipo de gado que você cria.",
    cor: "border-gray-200 hover:border-green-400",
  },
  {
    href: "/cotacoes",
    icon: "📈",
    titulo: "Cotações do Mercado",
    desc: "Preço atual do boi gordo na B3 (futuro) e CEPEA (físico), com histórico e filtro por estado.",
    cor: "border-gray-200 hover:border-green-400",
  },
];

export default function GestaoInteligenciaPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-cyan-600" />
        <h1 className="text-xl font-bold text-gray-900">Inteligência</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FERRAMENTAS.map(f => (
          <Link
            key={f.href}
            href={f.href}
            className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition group ${f.cor}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-900 group-hover:text-green-700 transition">{f.titulo}</p>
                  {f.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeCor}`}>{f.badge}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4 flex gap-3 items-start">
        <Zap size={18} className="text-cyan-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-cyan-800">Dica</p>
          <p className="text-xs text-cyan-700 mt-0.5">
            Use a <strong>Projeção de Venda</strong> antes de negociar um lote — ela mostra o preço mínimo para não ter prejuízo e o preço ideal para atingir sua meta de lucro.
          </p>
        </div>
      </div>
    </div>
  );
}
