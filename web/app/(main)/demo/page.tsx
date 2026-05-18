"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startTour } from "@/lib/tour";
import type { DriveStep } from "driver.js";
import {
  Beef, Layers, Syringe, Scale, Wallet, Package,
  Users, Sprout, Warehouse, Bot, BarChart2, TrendingUp,
  X, Play,
} from "lucide-react";

// ── Dados mock realistas ──────────────────────────────────────────────────────

const MOCK = {
  fazenda: "Fazenda Santa Cruz — MT",
  rebanho: { total: 247, machos: 89, femeas: 158, peso_medio: 412 },
  categorias: [
    { label: "Vacas",     qtd: 82, cor: "bg-pink-400"  },
    { label: "Novilhas",  qtd: 47, cor: "bg-pink-300"  },
    { label: "Bezerras",  qtd: 29, cor: "bg-pink-200"  },
    { label: "Bois",      qtd: 51, cor: "bg-blue-400"  },
    { label: "Novilhos",  qtd: 26, cor: "bg-blue-300"  },
    { label: "Bezerros",  qtd: 12, cor: "bg-blue-200"  },
  ],
  lotes: [
    { nome: "Terminação — Nelore",  cabecas: 62, gmd: 1.12, preco_arroba: 335, dias: 87 },
    { nome: "Recria — Angus x Nelo", cabecas: 48, gmd: 0.89, preco_arroba: 320, dias: 54 },
    { nome: "Cria — Matrizes",       cabecas: 82, gmd: 0.62, preco_arroba: 310, dias: 120 },
  ],
  alertas: [
    { desc: "Aftosa — dose 2",       animal: "Lote Terminação", vence: "em 3 dias",  urgente: true },
    { desc: "Vermifugação trimestral", animal: "Lote Recria",   vence: "em 12 dias", urgente: false },
    { desc: "Brucelose — reforço",   animal: "Brinco #0047",    vence: "em 18 dias", urgente: false },
  ],
  financeiro: {
    receitas: 148_500, custos: 89_200, saldo: 59_300,
    meses: [
      { m: "Jan", rec: 12000, cus: 8200 }, { m: "Fev", rec: 9500, cus: 7800 },
      { m: "Mar", rec: 14200, cus: 9100 }, { m: "Abr", rec: 11800, cus: 8600 },
      { m: "Mai", rec: 18500, cus: 10200 }, { m: "Jun", rec: 22000, cus: 11300 },
    ],
  },
  bovisco: { score: 78, grau: "B", label: "Bom", cor: "blue" },
  b3: { preco: 335.85, cepea: 329.40 },
};

const TOUR_STEPS: DriveStep[] = [
  { element: "#demo-kpis",      popover: { title: "📊 Painel de Resumo", description: "Acompanhe em tempo real o total do rebanho, composição por sexo e o peso médio dos animais.", side: "bottom" } },
  { element: "#demo-bovisco",   popover: { title: "🏆 BoviScore", description: "Índice exclusivo do Bovino que mede a saúde geral do seu rebanho de 0 a 100. Combina GMD, saúde, financeiro e completude dos dados.", side: "bottom" } },
  { element: "#demo-mercado",   popover: { title: "📈 Mercado em Tempo Real", description: "Cotação do boi gordo na B3 (futuro) e CEPEA (físico) direto no painel. Sem precisar abrir outro site.", side: "bottom" } },
  { element: "#demo-lotes",     popover: { title: "📦 Lotes com GMD", description: "Cada lote mostra o Ganho de Médio Diário. Cor verde = ótimo (≥0.8 kg/dia), amarelo = regular, vermelho = abaixo do esperado.", side: "top" } },
  { element: "#demo-alertas",   popover: { title: "💉 Alertas de Saúde", description: "Vacinas e tratamentos próximos do vencimento aparecem aqui. Nunca mais perca uma aplicação no rebanho.", side: "top" } },
  { element: "#demo-financeiro", popover: { title: "💰 Financeiro Visual", description: "Receitas vs custos por mês em gráfico de barras. Veja o saldo acumulado e a evolução do caixa da fazenda.", side: "top" } },
  { element: "#demo-modulos",   popover: { title: "🗂️ Todos os Módulos", description: "Além do dashboard, o Bovino oferece: Saúde, Reprodução, Banco Genético, Plano Nutricional, Fiscal, IA Gestor e muito mais.", side: "top" } },
  { element: "#demo-cta",       popover: { title: "🚀 Pronto para começar?", description: "Crie sua conta gratuitamente e gerencie seu rebanho com a plataforma mais completa do agronegócio brasileiro.", side: "top" } },
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

const MAX_REC = Math.max(...MOCK.financeiro.meses.map(m => m.rec));

export default function DemoPage() {
  const [tourStarted, setTourStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      await startTour("demo", TOUR_STEPS);
      setTourStarted(true);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  async function reiniciarTour() {
    await startTour("demo", TOUR_STEPS);
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Banner demo */}
      <div id="demo-banner" className="bg-amber-500 text-amber-950 rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div>
            <p className="font-bold text-sm">Modo Demonstração — {MOCK.fazenda}</p>
            <p className="text-xs opacity-75">Você está vendo dados de exemplo. Assine para usar com seu rebanho real.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={reiniciarTour}
            className="flex items-center gap-1 text-xs font-bold bg-amber-900/20 hover:bg-amber-900/30 px-3 py-1.5 rounded-full transition">
            <Play size={12} /> Tour guiado
          </button>
          <Link href="/planos"
            className="text-xs font-bold bg-amber-950 text-amber-100 px-4 py-1.5 rounded-full hover:bg-amber-900 transition">
            Assinar →
          </Link>
        </div>
      </div>

      {/* Header fazenda */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestão da Fazenda</h1>
          <p className="text-gray-500 text-sm">{MOCK.fazenda}</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-full opacity-60 cursor-not-allowed">🤖 IA Gestor</span>
          <span className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full opacity-60 cursor-not-allowed">+ Animal</span>
        </div>
      </div>

      {/* KPIs */}
      <div id="demo-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total rebanho",    value: MOCK.rebanho.total,      icon: "🐄" },
          { label: "Machos",           value: MOCK.rebanho.machos,     icon: "🐂" },
          { label: "Fêmeas",           value: MOCK.rebanho.femeas,     icon: "🐮" },
          { label: "Alertas de saúde", value: MOCK.alertas.length,     icon: "💉" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl mb-1">{card.icon}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* BoviScore + Mercado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* BoviScore */}
        <div id="demo-bovisco" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center border-4 border-blue-400 shrink-0">
              <span className="text-xl font-extrabold leading-none text-blue-700">{MOCK.bovisco.score}</span>
              <span className="text-[9px] font-bold text-blue-500">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800 text-sm">BoviScore</p>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-blue-700 bg-white/60">
                  {MOCK.bovisco.grau} · {MOCK.bovisco.label}
                </span>
              </div>
              {[
                { nome: "GMD",        pontos: 22, max: 30 },
                { nome: "Saúde",      pontos: 20, max: 25 },
                { nome: "Financeiro", pontos: 19, max: 25 },
                { nome: "Completude", pontos: 17, max: 20 },
              ].map(c => (
                <div key={c.nome} className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden w-24">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(c.pontos / c.max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 w-16 truncate">{c.nome}</span>
                  <span className="text-[10px] font-bold text-blue-700">{c.pontos}/{c.max}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mercado */}
        <div id="demo-mercado" className="bg-white border border-blue-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">● AO VIVO</span>
              <span className="text-xs text-gray-500 font-medium">BGI Futuro · B3</span>
            </div>
            <p className="text-2xl font-extrabold text-blue-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(MOCK.b3.preco)}
              <span className="text-sm text-gray-400 font-normal"> /@</span>
            </p>
            <p className="text-xs text-gray-400">
              CEPEA <strong className="text-green-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(MOCK.b3.cepea)}/@</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-green-600">▲ 0.43%</span>
            <p className="text-xs text-gray-400 mt-0.5">vs ontem</p>
          </div>
        </div>
      </div>

      {/* Lotes */}
      <div id="demo-lotes">
        <h2 className="text-sm font-bold text-gray-700 mb-3">📦 Lotes</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {MOCK.lotes.map(lote => {
            const cor = lote.gmd >= 0.8 ? "text-green-600 bg-green-50 border-green-200"
              : lote.gmd >= 0.4 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
              : "text-red-600 bg-red-50 border-red-200";
            return (
              <div key={lote.nome} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="font-bold text-gray-900 text-sm mb-0.5 truncate">{lote.nome}</p>
                <p className="text-xs text-gray-400">{lote.cabecas} cabeças · {lote.dias} dias</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${cor}`}>
                    GMD {lote.gmd.toFixed(2)} kg/d
                  </span>
                  <span className="text-xs text-gray-500">@ {fmt(lote.preco_arroba)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alertas saúde */}
      <div id="demo-alertas" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3">💉 Próximas doses / vacinas</h2>
        <ul className="space-y-2">
          {MOCK.alertas.map((a, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.urgente ? "bg-red-500" : "bg-yellow-400"}`} />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{a.desc}</p>
                <p className="text-gray-400 text-xs">{a.animal} · {a.vence}</p>
              </div>
              {a.urgente && <span className="text-xs text-red-600 font-bold">Urgente</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Gráfico financeiro */}
      <div id="demo-financeiro" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">💰 Caixa da Fazenda — 2025</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded-sm inline-block" /> Receitas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded-sm inline-block" /> Custos</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Receitas",    value: fmt(MOCK.financeiro.receitas), cor: "text-green-600" },
            { label: "Custos",      value: fmt(MOCK.financeiro.custos),   cor: "text-red-500"   },
            { label: "Saldo",       value: fmt(MOCK.financeiro.saldo),    cor: "text-blue-600"  },
          ].map(c => (
            <div key={c.label} className="text-center">
              <p className={`text-lg font-extrabold ${c.cor}`}>{c.value}</p>
              <p className="text-xs text-gray-400">{c.label} (ano)</p>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 h-28">
          {MOCK.financeiro.meses.map(m => (
            <div key={m.m} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 88 }}>
                <div className="flex-1 bg-green-500 rounded-t" style={{ height: `${(m.rec / MAX_REC) * 88}px` }} />
                <div className="flex-1 bg-red-400 rounded-t" style={{ height: `${(m.cus / MAX_REC) * 88}px` }} />
              </div>
              <span className="text-[10px] text-gray-400">{m.m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Módulos */}
      <div id="demo-modulos">
        <h2 className="text-sm font-bold text-gray-700 mb-3">🗂️ Módulos disponíveis</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
          {[
            { Icon: Beef,     label: "Rebanho",    color: "text-green-700 bg-green-50"    },
            { Icon: Layers,   label: "Lotes",      color: "text-blue-700 bg-blue-50"      },
            { Icon: Syringe,  label: "Saúde",      color: "text-red-600 bg-red-50"        },
            { Icon: Scale,    label: "Pesagens",   color: "text-amber-700 bg-amber-50"    },
            { Icon: Wallet,   label: "Financeiro", color: "text-emerald-700 bg-emerald-50"},
            { Icon: Package,  label: "Estoque",    color: "text-orange-700 bg-orange-50"  },
            { Icon: Users,    label: "Equipe",     color: "text-violet-700 bg-violet-50"  },
            { Icon: Sprout,   label: "Pasto",      color: "text-lime-700 bg-lime-50"      },
            { Icon: Bot,      label: "IA Gestor",  color: "text-purple-700 bg-purple-50"  },
          ].map(({ Icon, label, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center opacity-75">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-[10px] font-medium text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div id="demo-cta" className="bg-gradient-to-br from-green-800 to-emerald-700 rounded-3xl p-8 text-center text-white shadow-xl">
        <p className="text-3xl font-extrabold mb-2">Comece hoje mesmo</p>
        <p className="text-green-200 text-base mb-6 max-w-md mx-auto">
          Gerencie seu rebanho com a plataforma mais completa do agronegócio brasileiro. Planos a partir de <strong>R$ 150/mês</strong>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/planos"
            className="bg-white text-green-800 font-extrabold text-sm px-8 py-3.5 rounded-2xl hover:bg-green-50 transition shadow-sm">
            Ver planos e preços →
          </Link>
          <Link href="/cadastro"
            className="bg-green-600/40 border border-green-400 text-white font-bold text-sm px-8 py-3.5 rounded-2xl hover:bg-green-600/60 transition">
            Criar conta grátis
          </Link>
        </div>
        <p className="text-green-300 text-xs mt-4">Sem cartão de crédito · Cancele quando quiser</p>
      </div>

    </div>
  );
}
