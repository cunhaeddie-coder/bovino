"use client";

import Link from "next/link";
import { TrendingUp, BarChart2, MapPin, Zap } from "lucide-react";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  { element: "#intel-grid", popover: { title: "📊 Hub de Inteligência", description: "Central de análises e ferramentas de decisão para o seu negócio. Cada card leva a uma ferramenta específica.", side: "bottom" } },
  { popover: { title: "💹 Projeção de Venda", description: "Simule o resultado financeiro antes de negociar: receita esperada, preço de equilíbrio e o preço mínimo para atingir sua meta de lucro." } },
  { popover: { title: "📈 Minha @ vs Mercado", description: "Compare o preço por arroba dos seus lotes com a cotação B3 e CEPEA para saber se está acima ou abaixo do mercado." } },
  { popover: { title: "🐄 BoviScore & Raças", description: "BoviScore é o índice de saúde geral do seu rebanho (0–100). Raças em Números agrupa desempenho por raça: GMD, peso médio e preço/@." } },
];

const FERRAMENTAS = [
  {
    href: "/gestao/inteligencia/projecao-venda",
    icon: "📊",
    titulo: "Projeção de Venda",
    desc: "Simule o resultado financeiro de vender um lote: receita, lucro, preço de equilíbrio e preço para atingir sua meta.",
    badge: "Popular",
    cor: "border-blue-200 hover:border-blue-400",
    badgeCor: "bg-blue-100 text-blue-700",
  },
  {
    href: "/gestao/inteligencia/minha-arroba",
    icon: "💹",
    titulo: "Minha @ vs Mercado",
    desc: "Compare o preço por arroba dos seus lotes com a cotação B3 e CEPEA. Saiba se está acima ou abaixo do mercado.",
    cor: "border-green-200 hover:border-green-400",
  },
  {
    href: "/gestao/inteligencia/racas",
    icon: "🐄",
    titulo: "Raças em Números",
    desc: "Desempenho do rebanho agrupado por raça: quantidade, peso médio, GMD e preço por arroba.",
    cor: "border-amber-200 hover:border-amber-400",
  },
  {
    href: "/cotacoes",
    icon: "📈",
    titulo: "Cotações do Mercado",
    desc: "Preço atual do boi gordo na B3 (futuro) e CEPEA (físico), com histórico e filtro por estado.",
    cor: "border-gray-200 hover:border-green-400",
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
    href: "/gestao/movimentacoes",
    icon: "↕️",
    titulo: "Entradas e Saídas",
    desc: "Visão consolidada de todas as aquisições, vendas, mortes e descartes do rebanho.",
    cor: "border-cyan-200 hover:border-cyan-400",
  },
  {
    href: "/gestao/inteligencia/por-origem",
    icon: "🏡",
    titulo: "Desempenho por Origem",
    desc: "Compare o peso médio dos animais agrupados por fazenda ou criador de procedência.",
    cor: "border-orange-200 hover:border-orange-400",
  },
];

export default function GestaoInteligenciaPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-cyan-600" />
        <h1 className="text-xl font-bold text-gray-900">Inteligência</h1>
      </div>

      <div id="intel-grid" className="grid sm:grid-cols-2 gap-4">
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
      <TourButton tourKey="inteligencia" steps={TOUR_STEPS} />
    </div>
  );
}
