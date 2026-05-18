"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { X, ChevronDown, ChevronUp } from "lucide-react";

const KEY = "bovino_onboarding_dismissed";

type Passo = {
  id: string;
  icon: string;
  titulo: string;
  desc: string;
  href: string;
  cta: string;
};

const PASSOS: Passo[] = [
  { id: "fazenda",  icon: "🌾", titulo: "Cadastre sua fazenda",      desc: "Configure o nome, estado e município da sua propriedade.",        href: "/gestao/fazenda",   cta: "Configurar fazenda" },
  { id: "animal",   icon: "🐄", titulo: "Adicione o primeiro animal", desc: "Cadastre um animal com brinco, raça, categoria e peso.",           href: "/gestao/animais",   cta: "Ir para Rebanho" },
  { id: "lote",     icon: "📦", titulo: "Crie um lote",              desc: "Agrupe animais em lotes para controlar GMD e resultados.",         href: "/gestao/lotes",     cta: "Ir para Lotes" },
  { id: "pesagem",  icon: "⚖️", titulo: "Registre uma pesagem",      desc: "Acompanhe o ganho de peso médio diário (GMD) do rebanho.",         href: "/gestao/pesagens",  cta: "Ir para Pesagens" },
  { id: "saude",    icon: "💉", titulo: "Lance um evento de saúde",  desc: "Vacinas, vermífugos e tratamentos ficam no histórico do animal.",  href: "/gestao/saude",     cta: "Ir para Saúde" },
  { id: "financeiro", icon: "💰", titulo: "Explore o Financeiro",    desc: "Registre custos e receitas por lote e veja o gráfico de caixa.",   href: "/gestao/financeiro", cta: "Ir para Financeiro" },
];

function useConcluidos() {
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("bovino_onboarding_steps");
    if (saved) { try { setConcluidos(new Set(JSON.parse(saved))); } catch { /* */ } }

    // Verifica via API quais passos já foram feitos
    api.get("/gestao/rebanho/resumo")
      .then(r => {
        const done = new Set<string>();
        // Se tem fazenda (endpoint respondeu sem 403), fazenda está feita
        done.add("fazenda");
        if (r.data?.total > 0) done.add("animal");
        setConcluidos(d => new Set([...d, ...done]));
      }).catch(() => {});

    api.get("/gestao/lotes").then(r => {
      if (Array.isArray(r.data) && r.data.length > 0) marcar("lote");
    }).catch(() => {});

    api.get("/gestao/pesagens").then(r => {
      if (Array.isArray(r.data) && r.data.length > 0) marcar("pesagem");
    }).catch(() => {});
  }, []);

  function marcar(id: string) {
    setConcluidos(prev => {
      const next = new Set([...prev, id]);
      localStorage.setItem("bovino_onboarding_steps", JSON.stringify([...next]));
      return next;
    });
  }

  return { concluidos, marcar };
}

export function OnboardingChecklist() {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { concluidos } = useConcluidos();

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    // Mostra após 2s na primeira visita
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  function dispensar() {
    localStorage.setItem(KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const total = PASSOS.length;
  const feitos = PASSOS.filter(p => concluidos.has(p.id)).length;
  const pct = Math.round((feitos / total) * 100);
  const proximo = PASSOS.find(p => !concluidos.has(p.id));

  if (feitos === total) {
    dispensar();
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 z-40 w-72 bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden md:bottom-6 md:left-6">
      {/* Header */}
      <div className="bg-green-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Primeiros passos</p>
            <p className="text-green-200 text-xs">{feitos} de {total} concluídos</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(c => !c)} className="text-green-200 hover:text-white p-1">
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={dispensar} className="text-green-200 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-green-100">
        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
          {PASSOS.map(p => {
            const done = concluidos.has(p.id);
            const isNext = proximo?.id === p.id;
            return (
              <div key={p.id}
                className={`flex items-start gap-2.5 rounded-xl p-2.5 transition ${isNext ? "bg-green-50 border border-green-200" : done ? "opacity-50" : "bg-gray-50"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                  {done ? "✓" : p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>{p.titulo}</p>
                  {isNext && (
                    <>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{p.desc}</p>
                      <Link href={p.href}
                        className="inline-block mt-1.5 text-xs font-bold text-green-700 hover:underline">
                        {p.cta} →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
