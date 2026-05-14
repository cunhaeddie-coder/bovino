"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#btn-reportar",
    popover: {
      title: "📣 Reportar ocorrência",
      description: "Registre qualquer evento de campo: nascimento, morte, acidente, doença, fuga, cobertura, parto, cio. Informe urgência e o animal/lote/pasto envolvido.",
      side: "bottom",
    },
  },
  {
    element: "#filtros-eventos",
    popover: {
      title: "🔍 Filtros de ocorrências",
      description: "Filtre por tipo de evento (nascimento, morte, doença...) e por status (não resolvidos, resolvidos ou todos).",
      side: "bottom",
    },
  },
  {
    element: "#lista-eventos",
    popover: {
      title: "📋 Ocorrências registradas",
      description: "Cada card mostra o tipo, descrição, urgência e quem reportou. Clique em 'Resolver' para marcar a ocorrência como resolvida e registrar a resolução.",
      side: "top",
    },
  },
];

type Evento = {
  id: number; tipo: string; categoria_animal?: string; descricao: string; urgencia: string; resolvido: boolean;
  data_evento: string; resolucao: string | null;
  animal?: { brinco: string; nome: string };
  lote?: { nome: string };
  pastagem?: { nome: string };
  reportador: { nome: string };
};

const TIPO_EMOJI: Record<string, string> = {
  nascimento: "🐣", morte: "💀", acidente: "🚑", doença: "🤒",
  fuga: "🏃", cobertura: "❤️", parto: "🤱", cio: "🔴", outros: "📝",
};
const URGENCIA_COR: Record<string, string> = {
  alta: "bg-red-100 text-red-700 border-red-200",
  media: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baixa: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function EventosCampoPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroResolvido, setFiltroResolvido] = useState("nao");
  const [showModal, setShowModal] = useState(false);
  const [resolverEvento, setResolverEvento] = useState<Evento | null>(null);

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroResolvido !== "") params.set("resolvido", filtroResolvido === "sim" ? "1" : "0");
    const r = await api.get(`/gestao/eventos?${params}`).catch(() => ({ data: { data: [] } }));
    setEventos(r.data.data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtroTipo, filtroResolvido]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ocorrências de Campo</h1>
          <p className="text-gray-500 text-sm">Eventos reportados pelo vaqueiro e equipe</p>
        </div>
        <button id="btn-reportar" onClick={() => setShowModal(true)}
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">
          + Reportar ocorrência
        </button>
      </div>

      {/* Filtros */}
      <div id="filtros-eventos" className="flex gap-3 flex-wrap">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
          <option value="">Todos os tipos</option>
          {["nascimento","morte","acidente","doença","fuga","cobertura","parto","cio","outros"].map(t => (
            <option key={t} value={t}>{TIPO_EMOJI[t]} {t}</option>
          ))}
        </select>
        <select value={filtroResolvido} onChange={e => setFiltroResolvido(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
          <option value="nao">Não resolvidos</option>
          <option value="sim">Resolvidos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📣</p>
          <p className="text-gray-500">Nenhuma ocorrência encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Use o botão acima para reportar um evento de campo</p>
        </div>
      ) : (
        <div id="lista-eventos" className="grid gap-3">
          {eventos.map(ev => (
            <div key={ev.id} className={`bg-white rounded-2xl border shadow-sm p-3 md:p-5 ${ev.resolvido ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${URGENCIA_COR[ev.urgencia]}`}>
                  {TIPO_EMOJI[ev.tipo] ?? "📝"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 capitalize">{ev.tipo}</span>
                    {ev.categoria_animal && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold capitalize">{CAT_EMOJI[ev.categoria_animal] ?? "🐄"} {ev.categoria_animal}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${URGENCIA_COR[ev.urgencia]}`}>{ev.urgencia}</span>
                    {ev.resolvido && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Resolvido</span>}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{ev.descricao}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>{new Date(ev.data_evento).toLocaleString("pt-BR")}</span>
                    {ev.animal && <span>Animal: {ev.animal.brinco || ev.animal.nome}</span>}
                    {ev.lote    && <span>Lote: {ev.lote.nome}</span>}
                    {ev.pastagem && <span>Pasto: {ev.pastagem.nome}</span>}
                    <span>Reportado por: {ev.reportador?.nome}</span>
                  </div>
                  {ev.resolucao && <p className="text-xs text-green-700 mt-2 bg-green-50 rounded-lg px-3 py-1.5">✓ {ev.resolucao}</p>}
                </div>
                {!ev.resolvido && (
                  <button onClick={() => setResolverEvento(ev)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold whitespace-nowrap">
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ReportarModal onClose={() => setShowModal(false)} onDone={carregar} />}
      {resolverEvento && <ResolverModal evento={resolverEvento} onClose={() => setResolverEvento(null)} onDone={carregar} />}

      <TourButton tourKey="gestao-eventos" steps={TOUR_STEPS} />
    </div>
  );
}

function ReportarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    tipo: "outros", descricao: "", urgencia: "media",
    data_evento: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/gestao/eventos", form);
      onDone(); onClose();
    } catch { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-0 sm:mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Reportar Ocorrência</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Tipo de evento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "nascimento", e: "🐣" }, { v: "morte", e: "💀" }, { v: "acidente", e: "🚑" },
                { v: "doença", e: "🤒" },     { v: "fuga", e: "🏃" }, { v: "cobertura", e: "❤️" },
                { v: "parto", e: "🤱" },       { v: "cio", e: "🔴" }, { v: "outros", e: "📝" },
              ].map(({ v, e }) => (
                <button key={v} type="button" onClick={() => setForm({...form, tipo: v})}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition capitalize ${form.tipo === v ? "bg-green-50 border-green-400 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {e} {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição</label>
            <textarea required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
              rows={3} placeholder="Descreva o que aconteceu..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Urgência</label>
              <select value={form.urgencia} onChange={e => setForm({...form, urgencia: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta — precisa atenção</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data/hora</label>
              <input type="datetime-local" value={form.data_evento} onChange={e => setForm({...form, data_evento: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50">
              {saving ? "Enviando..." : "📣 Reportar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CATS_NASCIMENTO = ["bezerro", "bezerra"] as const;
const CATS_TODAS      = ["bezerro","bezerra","novilho","novilha","boi","touro","vaca"] as const;
const CAT_EMOJI: Record<string, string> = {
  bezerro:"🐂", bezerra:"🐄", novilho:"🐂", novilha:"🐄", boi:"🐃", touro:"🦬", vaca:"🐮",
};

function ResolverModal({ evento, onClose, onDone }: { evento: Evento; onClose: () => void; onDone: () => void }) {
  const isNascimento = evento.tipo === "nascimento";
  const isMorte      = evento.tipo === "morte";

  const [resolucao, setResolucao] = useState("");
  const [brinco, setBrinco]       = useState("");
  const [categoria, setCategoria] = useState(isNascimento ? "bezerro" : "boi");
  const [raca, setRaca]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "criado" | "baixado"; brinco: string; categoria: string } | null>(null);

  const cats = isNascimento ? CATS_NASCIMENTO : CATS_TODAS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = { resolucao };
      if (isNascimento && brinco) { payload.brinco = brinco; payload.categoria = categoria; payload.raca = raca; }
      if (isMorte) { payload.categoria = categoria; }
      const { data } = await api.post(`/gestao/eventos/${evento.id}/resolver`, payload);
      onDone();
      if (data.animal_criado)  setResultado({ tipo: "criado",  brinco: data.animal_criado.brinco,  categoria: data.animal_criado.categoria });
      else if (data.animal_baixado) setResultado({ tipo: "baixado", brinco: data.animal_baixado.brinco ?? data.animal_baixado.id, categoria: data.animal_baixado.categoria });
      else onClose();
    } catch { setSaving(false); }
  }

  if (resultado) {
    const isCriado = resultado.tipo === "criado";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center space-y-4">
          <p className="text-5xl">{isCriado ? "🐣" : "💀"}</p>
          <p className="font-bold text-gray-800 text-lg">{isCriado ? "Animal cadastrado no rebanho!" : "Baixa registrada no rebanho"}</p>
          <div className={`border rounded-xl p-4 text-sm ${isCriado ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            <p><strong>Brinco:</strong> {resultado.brinco}</p>
            <p><strong>Categoria:</strong> {CAT_EMOJI[resultado.categoria]} {resultado.categoria}</p>
          </div>
          <p className="text-xs text-gray-400">
            {isCriado ? "O animal foi adicionado ao rebanho." : "O animal foi marcado como morto no rebanho."}
          </p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700">OK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">
            {isNascimento ? "🐣 Confirmar nascimento" : isMorte ? "💀 Registrar morte" : "Resolver Ocorrência"}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{TIPO_EMOJI[evento.tipo]} {evento.descricao}</p>

          {/* Campos para nascimento */}
          {isNascimento && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Cadastrar animal no rebanho</p>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">O que nasceu?</label>
                <div className="grid grid-cols-2 gap-2">
                  {cats.map(c => (
                    <button key={c} type="button" onClick={() => setCategoria(c)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition ${categoria === c ? "bg-amber-600 text-white border-amber-600" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                      {CAT_EMOJI[c]} {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Brinco / Nº de identificação *</label>
                <input value={brinco} onChange={e => setBrinco(e.target.value)} required
                  placeholder="Ex: 0042"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Raça (opcional)</label>
                <input value={raca} onChange={e => setRaca(e.target.value)}
                  placeholder="Ex: Nelore, Angus..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
          )}

          {/* Campos para morte */}
          {isMorte && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                {evento.animal ? `Animal vinculado: ${evento.animal.brinco || evento.animal.nome}` : "Qual categoria de animal morreu?"}
              </p>
              {evento.animal ? (
                <p className="text-xs text-red-600">Este animal será marcado como <strong>morto</strong> no rebanho.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {cats.map(c => (
                    <button key={c} type="button" onClick={() => setCategoria(c)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${categoria === c ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:border-red-300"}`}>
                      {CAT_EMOJI[c]} {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea value={resolucao} onChange={e => setResolucao(e.target.value)}
            rows={2}
            placeholder={isNascimento ? "Observações (mãe, peso ao nascer...)" : isMorte ? "Causa da morte (opcional)..." : "Descreva como foi resolvido (opcional)..."}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving || (isNascimento && !brinco)}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition ${isMorte ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
              {saving ? "Salvando..." : isNascimento ? "🐣 Cadastrar no rebanho" : isMorte ? "💀 Confirmar baixa" : "✓ Marcar resolvido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
