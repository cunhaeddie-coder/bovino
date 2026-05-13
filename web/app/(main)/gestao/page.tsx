"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Beef, Layers, Syringe, Scale, Wallet, Package,
  Users, AlertTriangle, Home, Sprout, Warehouse, Bot,
  BarChart2, Receipt, FileBarChart2, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#gestao-kpis",
    popover: {
      title: "📊 Resumo do rebanho",
      description: "Aqui você vê em tempo real o total de animais, quantos são machos, fêmeas e quantos alertas de saúde estão pendentes.",
      side: "bottom",
    },
  },
  {
    element: "#gestao-valor",
    popover: {
      title: "💰 Valor estimado",
      description: "A IA calcula automaticamente o valor estimado do seu rebanho com base na cotação atual da arroba. Atualizado diariamente.",
      side: "bottom",
    },
  },
  {
    element: "#gestao-alertas",
    popover: {
      title: "💉 Alertas de saúde",
      description: "Vacinas e doses próximas do vencimento aparecem aqui para você não perder nenhuma aplicação no rebanho.",
      side: "top",
    },
  },
  {
    element: "#gestao-modulos",
    popover: {
      title: "🗂️ Módulos da gestão",
      description: "Acesse todos os módulos: rebanho, lotes, saúde, pesagens, financeiro, estoque, equipe, ocorrências, app pasto e app curral.",
      side: "top",
    },
  },
  {
    element: "#btn-ia-gestor",
    popover: {
      title: "🤖 IA Gestor",
      description: "Converse com a inteligência artificial para obter insights sobre seu rebanho, sugestões de manejo e análises de produtividade.",
      side: "bottom",
    },
  },
  {
    element: "#btn-add-animal",
    popover: {
      title: "➕ Adicionar animal",
      description: "Clique aqui para cadastrar um novo animal no seu rebanho com todas as informações: brinco, raça, categoria, peso e muito mais.",
      side: "bottom",
    },
  },
];

type Resumo = {
  total: number; machos: number; femeas: number;
  por_categoria: Record<string, number>;
};
type AlertaSaude = {
  id: number; descricao: string; tipo: string; proxima_dose: string;
  animal?: { brinco: string; nome: string }; lote?: { nome: string };
};
type MatchLote = {
  lote: { id: number; nome: string; raca: string; qtd_cabecas: number };
  buscas: number;
};
type ValorRebanho = {
  valor_total_rebanho: number; total_animais: number; cotacao_arroba: number;
  detalhes: { categoria: string; quantidade: number; valor_total: number }[];
};

const CATEGORIA_LABEL: Record<string, string> = {
  bezerro: "Bezerros", bezerra: "Bezerras", novilho: "Novilhos",
  novilha: "Novilhas", touro: "Touros", vaca: "Vacas", boi: "Bois"
};

function SetupFazendaPrompt() {
  const [form, setForm] = useState({ nome: "", estado: "", municipio: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function gerarSlug(nome: string) {
    return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try { await api.post("/fazenda", form); window.location.reload(); }
    catch (err: any) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : (err.response?.data?.message ?? "Erro."));
    } finally { setSaving(false); }
  }
  const UF = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌾</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Cadastre sua fazenda</h1>
          <p className="text-gray-500 text-sm mt-2">Configure o perfil da sua propriedade para começar.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nome da propriedade</label>
            <input value={form.nome} onChange={(e) => { const nome = e.target.value; setForm({ ...form, nome, slug: gerarSlug(nome) }); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Ex: Fazenda Santa Cruz" required />
          </div>
          {form.slug && <p className="text-xs text-gray-400">Perfil público: <span className="font-mono text-green-700">/fazenda/{form.slug}</span></p>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required>
                <option value="">UF</option>
                {UF.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Município</label>
              <input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Cidade" required />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-60">
            {saving ? "Criando fazenda..." : "Criar fazenda e começar →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GestaoDashboard() {
  const [resumo, setResumo]           = useState<Resumo | null>(null);
  const [alertas, setAlertas]         = useState<AlertaSaude[]>([]);
  const [matches, setMatches]         = useState<MatchLote[]>([]);
  const [valorRebanho, setValorRebanho] = useState<ValorRebanho | null>(null);
  const [semFazenda, setSemFazenda]   = useState(false);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    api.get("/gestao/rebanho/resumo")
      .then(r => { setResumo(r.data); setSemFazenda(false); })
      .catch((e) => { if (e.response?.status === 403) setSemFazenda(true); })
      .finally(() => setLoaded(true));
    api.get("/gestao/saude/alertas").then(r => setAlertas(r.data)).catch(() => {});
    api.get("/inteligencia/match-lotes").then(r => setMatches(r.data)).catch(() => {});
    api.get("/gestao/ia/valor-rebanho").then(r => setValorRebanho(r.data)).catch(() => {});
  }, []);

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
    </div>
  );
  if (semFazenda) return <SetupFazendaPrompt />;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão da Fazenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle total da sua propriedade</p>
        </div>
        <div className="flex gap-2">
          <Link id="btn-ia-gestor" href="/gestao/gestor" className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition">
            🤖 IA Gestor
          </Link>
          <Link id="btn-add-animal" href="/gestao/animais" className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
            + Animal
          </Link>
        </div>
      </div>

      {/* KPIs principais */}
      <div id="gestao-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total rebanho",    value: resumo?.total ?? "—",    icon: "🐄" },
          { label: "Machos",           value: resumo?.machos ?? "—",   icon: "🐂" },
          { label: "Fêmeas",           value: resumo?.femeas ?? "—",   icon: "🐮" },
          { label: "Alertas de saúde", value: alertas.length,          icon: "💉" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl mb-1">{card.icon}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Card valor do rebanho */}
      {valorRebanho && valorRebanho.total_animais > 0 && (
        <div id="gestao-valor" className="bg-linear-to-r from-green-700 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium mb-1">💰 Valor estimado do rebanho</p>
              <p className="text-4xl font-extrabold">{fmt(valorRebanho.valor_total_rebanho)}</p>
              <p className="text-green-200 text-xs mt-1">
                {valorRebanho.total_animais} animais · @arroba {fmt(valorRebanho.cotacao_arroba)}/arroba
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-green-200 text-xs mb-2 font-semibold">Por categoria</p>
              {valorRebanho.detalhes.slice(0, 4).map(d => (
                <p key={d.categoria} className="text-green-100 text-xs">
                  {d.quantidade}x {CATEGORIA_LABEL[d.categoria] ?? d.categoria}: {fmt(d.valor_total)}
                </p>
              ))}
            </div>
          </div>
          <p className="text-green-300 text-xs mt-3">* Estimativa baseada no peso médio e cotação atual. Não representa valor de mercado definitivo.</p>
        </div>
      )}

      {/* Composição */}
      {resumo && Object.keys(resumo.por_categoria).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Composição do rebanho</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Object.entries(resumo.por_categoria).map(([cat, qtd]) => (
              <div key={cat} className="text-center">
                <p className="text-xl font-bold text-gray-900">{qtd}</p>
                <p className="text-xs text-gray-400">{CATEGORIA_LABEL[cat] ?? cat}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Alertas saúde */}
        <div id="gestao-alertas" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">💉 Próximas doses / vacinas</h2>
            <Link href="/gestao/saude" className="text-xs text-green-700 hover:underline">Ver tudo →</Link>
          </div>
          {alertas.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">Nenhum vencimento nos próximos 30 dias</p>
            : <ul className="space-y-2">
                {alertas.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${new Date(a.proxima_dose) <= new Date() ? "bg-red-500" : "bg-yellow-400"}`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{a.descricao}</p>
                      <p className="text-gray-400 text-xs">
                        {a.animal ? `Brinco ${a.animal.brinco || a.animal.nome}` : a.lote?.nome ?? "Lote"}
                        {" · "}{new Date(a.proxima_dose).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
          }
        </div>

        {/* Demanda pelos lotes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">📈 Compradores buscando seus lotes</h2>
            <Link href="/inteligencia" className="text-xs text-green-700 hover:underline">Ver detalhes →</Link>
          </div>
          {matches.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">Nenhuma busca ativa para seus lotes</p>
            : <ul className="space-y-2">
                {matches.slice(0, 5).map((m) => (
                  <li key={m.lote.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{m.lote.nome}</p>
                      <p className="text-gray-400 text-xs">{m.lote.raca} · {m.lote.qtd_cabecas} cab.</p>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{m.buscas} buscas/sem</span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>

      {/* Atalhos para todos os módulos */}
      <div id="gestao-modulos">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Módulos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {(
            [
              { href: "/gestao/animais",       Icon: Beef,          label: "Rebanho",       color: "text-green-700 bg-green-50"   },
              { href: "/gestao/lotes",         Icon: Layers,        label: "Lotes",         color: "text-blue-700 bg-blue-50"     },
              { href: "/gestao/saude",         Icon: Syringe,       label: "Saúde",         color: "text-red-600 bg-red-50"       },
              { href: "/gestao/pesagens",      Icon: Scale,         label: "Pesagens",      color: "text-amber-700 bg-amber-50"   },
              { href: "/gestao/financeiro",    Icon: Wallet,        label: "Financeiro",    color: "text-emerald-700 bg-emerald-50"},
              { href: "/gestao/fiscal",        Icon: Receipt,        label: "Fiscal",        color: "text-indigo-700 bg-indigo-50"   },
              { href: "/gestao/relatorios",    Icon: FileBarChart2,  label: "Relatórios",    color: "text-violet-700 bg-violet-50"   },
              { href: "/gestao/insumos",       Icon: Package,       label: "Estoque",       color: "text-orange-700 bg-orange-50" },
              { href: "/gestao/funcionarios",  Icon: Users,         label: "Equipe",        color: "text-violet-700 bg-violet-50" },
              { href: "/gestao/eventos",       Icon: AlertTriangle, label: "Ocorrências",   color: "text-yellow-700 bg-yellow-50" },
              { href: "/gestao/arrendamentos", Icon: Home,          label: "Arrendamentos", color: "text-teal-700 bg-teal-50"     },
              { href: "/gestao/pasto",         Icon: Sprout,        label: "App Pasto",     color: "text-lime-700 bg-lime-50"     },
              { href: "/gestao/curral",        Icon: Warehouse,     label: "App Curral",    color: "text-amber-800 bg-amber-100"  },
              { href: "/gestao/gestor",        Icon: Bot,           label: "IA Gestor",     color: "text-violet-700 bg-violet-50" },
              { href: "/inteligencia",         Icon: BarChart2,     label: "Inteligência",  color: "text-sky-700 bg-sky-50"       },
            ] as { href: string; Icon: LucideIcon; label: string; color: string }[]
          ).map(({ href, Icon, label, color }) => (
            <Link key={href} href={href}
              className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-green-300 hover:shadow-sm transition-all group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 ${color} group-hover:scale-105 transition-transform`}>
                <Icon size={22} />
              </div>
              <p className="text-xs font-medium text-gray-700">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      <TourButton tourKey="gestao" steps={TOUR_STEPS} />
    </div>
  );
}
