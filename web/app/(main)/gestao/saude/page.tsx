"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#btn-evento-saude",
    popover: {
      title: "💉 Registrar evento de saúde",
      description: "Registre vacinas, vermífugos, tratamentos, exames e cirurgias. Informe o animal ou lote, data de aplicação e próxima dose.",
      side: "bottom",
    },
  },
  {
    element: "#banner-alertas-saude",
    popover: {
      title: "⚠️ Alertas de vencimento",
      description: "Quando uma dose estiver próxima do vencimento (30 dias), aparece aqui um alerta em vermelho para você não perder a aplicação.",
      side: "bottom",
    },
  },
  {
    element: "#lista-saude",
    popover: {
      title: "📋 Histórico de saúde",
      description: "Todos os eventos registrados aparecem aqui. Eventos com próxima dose vencida ficam destacados em vermelho. Clique no lixo para excluir.",
      side: "top",
    },
  },
];

type EventoSaude = {
  id: number;
  tipo: string;
  descricao: string;
  produto: string | null;
  data_aplicacao: string;
  proxima_dose: string | null;
  custo: number | null;
  veterinario: string | null;
  animal?: { brinco: string | null; nome: string | null } | null;
  lote?: { nome: string } | null;
};

const TIPOS = ["vacina","vermifugo","tratamento","exame","cirurgia","outro"];
const TIPO_ICON: Record<string, string> = {
  vacina: "💉", vermifugo: "🧪", tratamento: "🩺", exame: "🔬", cirurgia: "⚕️", outro: "📋"
};

export default function SaudePage() {
  const [eventos, setEventos] = useState<EventoSaude[]>([]);
  const [alertas, setAlertas] = useState<EventoSaude[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [soVencendo, setSoVencendo] = useState(false);
  const [form, setForm] = useState({ tipo: "vacina", descricao: "", produto: "", data_aplicacao: new Date().toISOString().slice(0, 10), proxima_dose: "", veterinario: "", custo: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const params = soVencendo ? "?vencendo=1" : "";
    await Promise.all([
      api.get(`/gestao/saude${params}`).then(r => setEventos(r.data.data ?? r.data)),
      api.get("/gestao/saude/alertas").then(r => setAlertas(r.data)),
    ]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [soVencendo]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/gestao/saude", {
        ...form,
        custo: form.custo ? Number(form.custo) : null,
        proxima_dose: form.proxima_dose || null,
      });
      setShowForm(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este evento?")) return;
    await api.delete(`/gestao/saude/${id}`);
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base md:text-xl font-bold text-gray-900">💉 Saúde do rebanho</h1>
        <button id="btn-evento-saude" onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Registrar evento
        </button>
      </div>

      {/* Banner de alertas */}
      {alertas.length > 0 && (
        <div id="banner-alertas-saude" className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 font-semibold text-sm mb-2">⚠️ {alertas.length} vencimento(s) nos próximos 30 dias</p>
          <div className="space-y-1">
            {alertas.map(a => (
              <p key={a.id} className="text-xs text-red-600">
                {TIPO_ICON[a.tipo]} {a.descricao}
                {a.animal && ` — Brinco ${a.animal.brinco || a.animal.nome}`}
                {a.lote && ` — ${a.lote.nome}`}
                <span className="font-bold ml-1">· {new Date(a.proxima_dose!).toLocaleDateString("pt-BR")}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filtro */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
        <input type="checkbox" checked={soVencendo} onChange={e => setSoVencendo(e.target.checked)} className="rounded" />
        Mostrar apenas vencendo em 30 dias
      </label>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Novo evento de saúde</h2>
              <form onSubmit={salvar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo *</label>
                    <select required value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Data aplicação *</label>
                    <input required type="date" value={form.data_aplicacao} onChange={e => setForm(f => ({...f, data_aplicacao: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição *</label>
                    <input required value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Vacina aftosa dose 1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Produto</label>
                    <input value={form.produto} onChange={e => setForm(f => ({...f, produto: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Aftovac" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Próxima dose</label>
                    <input type="date" value={form.proxima_dose} onChange={e => setForm(f => ({...f, proxima_dose: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Veterinário</label>
                    <input value={form.veterinario} onChange={e => setForm(f => ({...f, veterinario: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Dr. João" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Custo (R$)</label>
                    <input type="number" value={form.custo} onChange={e => setForm(f => ({...f, custo: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
                  <button type="submit" disabled={salvando}
                    className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm disabled:opacity-60">
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">💉</p>
          <p className="text-gray-500 font-medium">Nenhum evento registrado</p>
        </div>
      ) : (
        <div id="lista-saude" className="space-y-2">
          {eventos.map(ev => {
            const vencido = ev.proxima_dose && ev.proxima_dose < hoje;
            const vencendoBreve = ev.proxima_dose && ev.proxima_dose >= hoje;
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <span className="text-2xl">{TIPO_ICON[ev.tipo]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{ev.descricao}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ev.produto && <span>{ev.produto} · </span>}
                    {new Date(ev.data_aplicacao).toLocaleDateString("pt-BR")}
                    {ev.animal && <span> · Brinco {ev.animal.brinco || ev.animal.nome}</span>}
                    {ev.lote && <span> · {ev.lote.nome}</span>}
                  </p>
                  {ev.proxima_dose && (
                    <p className={`text-xs font-semibold mt-1 ${vencido ? "text-red-500" : "text-yellow-600"}`}>
                      {vencido ? "⚠️ Vencida" : "🔔 Próxima dose"}: {new Date(ev.proxima_dose).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                {ev.custo && (
                  <span className="text-xs text-gray-500 shrink-0">R$ {ev.custo.toFixed(2)}</span>
                )}
                <button onClick={() => excluir(ev.id)} className="text-gray-300 hover:text-red-400 transition text-lg shrink-0">×</button>
              </div>
            );
          })}
        </div>
      )}

      <TourButton tourKey="gestao-saude" steps={TOUR_STEPS} />
    </div>
  );
}
