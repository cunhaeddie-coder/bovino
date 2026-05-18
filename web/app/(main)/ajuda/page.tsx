"use client";

import Link from "next/link";
import { startTour, resetTour } from "@/lib/tour";
import type { DriveStep } from "driver.js";

type Modulo = {
  href: string;
  icon: string;
  titulo: string;
  desc: string;
  tourKey?: string;
  tourSteps?: DriveStep[];
  badge?: string;
};

type Grupo = { titulo: string; icon: string; cor: string; modulos: Modulo[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Marketplace", icon: "🛒", cor: "border-green-200 bg-green-50",
    modulos: [
      { href: "/anuncios",       icon: "📢", titulo: "Meus Anúncios",        desc: "Publique lotes à venda, defina preço, fotos e informações do gado. Seus anúncios aparecem para compradores de todo o Brasil." },
      { href: "/cotacoes",       icon: "📈", titulo: "Cotações do Mercado",   desc: "Preço do boi gordo na B3 (futuro) e CEPEA (físico) em tempo real, com gráfico histórico e filtro por estado." },
      { href: "/inteligencia",   icon: "🗺️", titulo: "Mapa de Demanda",       desc: "Veja onde estão os compradores ativos e as regiões com maior demanda por tipo de gado." },
      { href: "/planos",         icon: "⭐", titulo: "Planos",                desc: "Escolha o plano ideal para seu rebanho. Use a calculadora para simular o custo por animal/mês.", badge: "Upgade" },
    ],
  },
  {
    titulo: "Rebanho", icon: "🐄", cor: "border-blue-200 bg-blue-50",
    modulos: [
      { href: "/gestao/animais",  icon: "🐄", titulo: "Animais",    desc: "Cadastre animais individualmente ou em grupo. Acompanhe composição do rebanho, faixa etária e alertas de manejo (desmama, baixo peso).", tourKey: "animais" },
      { href: "/gestao/lotes",    icon: "📦", titulo: "Lotes",      desc: "Agrupe animais em lotes para acompanhar GMD, evolução de peso e simular projeção de venda.", tourKey: "lotes" },
      { href: "/gestao/pesagens", icon: "⚖️", titulo: "Pesagens",   desc: "Registre pesagens individuais ou em lote. O sistema calcula o GMD automaticamente e mostra a evolução.", tourKey: "pesagens" },
      { href: "/gestao/reproducao", icon: "🤰", titulo: "Reprodução", desc: "Registre coberturas, confirme gestações, acompanhe parições e controle o ciclo reprodutivo das fêmeas." },
      { href: "/gestao/genetica", icon: "🧬", titulo: "Banco Genético", desc: "Controle o estoque de sêmen dos touros. Registre doses compradas e baixe quando realizar inseminações.", tourKey: "genetica" },
    ],
  },
  {
    titulo: "Saúde & Nutrição", icon: "💉", cor: "border-red-200 bg-red-50",
    modulos: [
      { href: "/gestao/saude",      icon: "💉", titulo: "Saúde",             desc: "Registre vacinas, vermífugos, tratamentos e exames. Receba alertas quando uma dose estiver vencendo.", tourKey: "saude" },
      { href: "/gestao/nutricional", icon: "🌿", titulo: "Plano Nutricional", desc: "Crie protocolos alimentares por categoria de animal com ingredientes, quantidades e custo estimado/dia.", tourKey: "nutricional" },
    ],
  },
  {
    titulo: "Financeiro & Fiscal", icon: "💰", cor: "border-emerald-200 bg-emerald-50",
    modulos: [
      { href: "/gestao/financeiro",    icon: "💰", titulo: "Financeiro",        desc: "Registre custos e receitas por lote. Visualize o gráfico de caixa (receitas vs custos) e importe NF-e via XML.", tourKey: "financeiro" },
      { href: "/gestao/fiscal",        icon: "🧾", titulo: "Fiscal",            desc: "Importe notas fiscais XML para lançar custos automaticamente. Visualize emitente, itens e valores." },
      { href: "/gestao/movimentacoes", icon: "↕️", titulo: "Entradas e Saídas", desc: "Visão consolidada de aquisições, vendas e perdas do rebanho com resumo financeiro por período.", tourKey: "movimentacoes" },
      { href: "/gestao/insumos",       icon: "📦", titulo: "Estoque",           desc: "Controle o estoque de insumos (medicamentos, ração, vacinas). Receba alertas de estoque baixo.", tourKey: "insumos" },
    ],
  },
  {
    titulo: "Inteligência & Análises", icon: "📊", cor: "border-cyan-200 bg-cyan-50",
    modulos: [
      { href: "/gestao/inteligencia",                    icon: "🧠", titulo: "Hub de Inteligência",      desc: "Central com todas as ferramentas de análise e decisão em um só lugar.", tourKey: "inteligencia", badge: "Novo" },
      { href: "/gestao/inteligencia/projecao-venda",     icon: "📊", titulo: "Projeção de Venda",       desc: "Simule o resultado de vender um lote: receita, lucro, preço de equilíbrio e preço para meta." },
      { href: "/gestao/inteligencia/minha-arroba",       icon: "💹", titulo: "Minha @ vs Mercado",      desc: "Compare o preço/@ dos seus lotes com B3 e CEPEA. Saiba se está acima ou abaixo do mercado." },
      { href: "/gestao/inteligencia/racas",              icon: "🐄", titulo: "Raças em Números",         desc: "Desempenho agrupado por raça: quantidade, peso médio, GMD e preço por arroba." },
      { href: "/gestao/inteligencia/por-origem",         icon: "🏡", titulo: "Desempenho por Origem",   desc: "Compare o desempenho dos animais agrupados por fazenda ou criador de procedência." },
    ],
  },
  {
    titulo: "Campo & Operações", icon: "🌾", cor: "border-amber-200 bg-amber-50",
    modulos: [
      { href: "/gestao/pasto",         icon: "🌿", titulo: "App Pasto",       desc: "Gerencie pastagens, rotação de piquetes e ocupe a área de forma eficiente." },
      { href: "/gestao/curral",        icon: "🏗️", titulo: "App Curral",      desc: "Controle operações de curral: entrada e saída de animais, pesagens e separação de lotes." },
      { href: "/gestao/funcionarios",  icon: "👥", titulo: "Equipe",          desc: "Cadastre funcionários, defina funções e controle o acesso ao sistema." },
      { href: "/gestao/eventos",       icon: "⚠️", titulo: "Ocorrências",     desc: "Registre eventos inesperados no campo: mortes, roubos, acidentes, condições climáticas." },
      { href: "/gestao/arrendamentos", icon: "📜", titulo: "Arrendamentos",   desc: "Controle contratos de arrendamento de terras: área, valor, vencimento e renovação." },
    ],
  },
  {
    titulo: "IA & Relatórios", icon: "🤖", cor: "border-violet-200 bg-violet-50",
    modulos: [
      { href: "/gestao/gestor",    icon: "🤖", titulo: "IA Gestor",    desc: "Converse com a inteligência artificial para obter insights, sugestões de manejo e análises do rebanho.", badge: "IA" },
      { href: "/gestao/relatorios", icon: "📑", titulo: "Relatórios",  desc: "Gere relatórios de rebanho, saúde, financeiro e lotes em PDF ou planilha para apresentar a terceiros." },
      { href: "/gestao/leiteiro",  icon: "🥛", titulo: "Módulo Leiteiro", desc: "Controle específico para rebanhos leiteiros: produção por animal, qualidade do leite e custos." },
      { href: "/gestao/gta",       icon: "📄", titulo: "GTA Digital",  desc: "Emita e controle as Guias de Transporte Animal. Rastreabilidade completa integrada ao SISBOV." },
    ],
  },
];

function launchTour(tourKey: string) {
  resetTour(tourKey);
  window.location.href = "/" + (tourKey === "animais" ? "gestao/animais"
    : tourKey === "lotes" ? "gestao/lotes"
    : tourKey === "pesagens" ? "gestao/pesagens"
    : tourKey === "saude" ? "gestao/saude"
    : tourKey === "financeiro" ? "gestao/financeiro"
    : tourKey === "genetica" ? "gestao/genetica"
    : tourKey === "nutricional" ? "gestao/nutricional"
    : tourKey === "movimentacoes" ? "gestao/movimentacoes"
    : tourKey === "insumos" ? "gestao/insumos"
    : tourKey === "inteligencia" ? "gestao/inteligencia"
    : "gestao");
}

export default function AjudaPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">📚 Central de Ajuda</h1>
        <p className="text-gray-500 text-sm mt-1">
          Todos os módulos do Bovino explicados. Clique em <strong>Ver tour</strong> para um guia interativo na tela.
        </p>
      </div>

      {/* Demo CTA */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-5 flex items-center justify-between gap-4 text-white">
        <div>
          <p className="font-bold text-lg">🎯 Quer ver tudo funcionando?</p>
          <p className="text-green-100 text-sm">Acesse o modo demonstração com dados reais de uma fazenda de exemplo.</p>
        </div>
        <Link href="/demo"
          className="shrink-0 bg-white text-green-800 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition whitespace-nowrap">
          Ver demonstração →
        </Link>
      </div>

      {/* Grupos de módulos */}
      {GRUPOS.map(grupo => (
        <div key={grupo.titulo}>
          <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${grupo.cor.split(" ")[0]}`}>
            <span className="text-xl">{grupo.icon}</span>
            <h2 className="text-base font-bold text-gray-800">{grupo.titulo}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {grupo.modulos.map(m => (
              <div key={m.href} className={`rounded-2xl border p-4 ${grupo.cor}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-800 text-sm">{m.titulo}</p>
                      {m.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-600 text-white">{m.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{m.desc}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Link href={m.href} className="text-xs font-semibold text-green-700 hover:underline">
                        Abrir módulo →
                      </Link>
                      {m.tourKey && (
                        <button
                          onClick={() => launchTour(m.tourKey!)}
                          className="text-xs font-semibold text-blue-600 hover:underline">
                          ▶ Ver tour
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
