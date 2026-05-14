"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Animal = { id: number; brinco: string | null; nome: string | null; raca: string };
type Evento = {
  id: number;
  tipo: string;
  data_evento: string;
  resultado: boolean | null;
  touro_brinco: string | null;
  semen_codigo: string | null;
  peso_bezerro: number | null;
  sexo_bezerro: string | null;
  observacao: string | null;
  animal?: Animal | null;
};
type Dashboard = {
  total_femeas: number;
  prenhas: number;
  partos_esperados: number;
  eventos_recentes: Evento[];
};
type PartoEsperado = {
  id: number;
  animal: Animal | null;
  data_cobertura: string;
  parto_esperado: string;
  dias_restantes: number;
  touro_brinco: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  cobertura:            "Cobertura Natural",
  iatf:                 "IATF",
  diagnostico_prenhez:  "Diagnóstico de Prenhez",
  parto:                "Parto",
  desmame:              "Desmame",
  descarte:             "Descarte Reprodutivo",
};

const TIPO_COR: Record<string, string> = {
  cobertura:            "bg-pink-100 text-pink-700",
  iatf:                 "bg-violet-100 text-violet-700",
  diagnostico_prenhez:  "bg-blue-100 text-blue-700",
  parto:                "bg-green-100 text-green-700",
  desmame:              "bg-amber-100 text-amber-700",
  descarte:             "bg-red-100 text-red-700",
};

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

export default function ReproducaoPage() {
  const [dash, setDash]       = useState<Dashboard | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [partos, setPartos]   = useState<PartoEsperado[]>([]);
  const [aba, setAba]         = useState<"dashboard"|"historico"|"partos">("dashboard");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function carregar() {
    setLoading(true);
    const [d, e, p] = await Promise.all([
      api.get("/gestao/reproducao/dashboard").then(r => r.data).catch(() => null),
      api.get("/gestao/reproducao").then(r => {
        const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []);
      }).catch(() => []),
      api.get("/gestao/reproducao/proximos-partos?dias=60").then(r => r.data).catch(() => []),
    ]);
    setDash(d); setEventos(e); setPartos(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const eventosFiltrados = filtroTipo
    ? eventos.filter(e => e.tipo === filtroTipo)
    : eventos;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reprodução</h1>
          <p className="text-gray-500 text-sm">Coberturas, diagnósticos e partos do rebanho</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition">
          + Registrar evento
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { k: "dashboard", label: "📊 Resumo" },
          { k: "historico", label: "📋 Histórico" },
          { k: "partos",    label: `🐄 Partos esperados${partos.length > 0 ? ` (${partos.length})` : ""}` },
        ] as const).map(({ k, label }) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${aba === k ? "border-b-2 border-pink-600 text-pink-700" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {aba === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
              <p className="text-2xl mb-1">🐮</p>
              <p className="text-3xl font-bold text-gray-900">{dash?.total_femeas ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Fêmeas no rebanho</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
              <p className="text-2xl mb-1">🤰</p>
              <p className="text-3xl font-bold text-pink-600">{dash?.prenhas ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Prenhas confirmadas</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
              <p className="text-2xl mb-1">🍼</p>
              <p className="text-3xl font-bold text-green-600">{dash?.partos_esperados ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Partos nos próximos 60 dias</p>
            </div>
          </div>

          {dash && dash.total_femeas > 0 && dash.prenhas > 0 && (
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-pink-800">
                Taxa de prenhez: {Math.round((dash.prenhas / dash.total_femeas) * 100)}%
              </p>
              <div className="mt-2 h-2 bg-pink-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((dash.prenhas / dash.total_femeas) * 100))}%` }} />
              </div>
            </div>
          )}

          {(dash?.eventos_recentes ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Últimos eventos</h2>
              <div className="space-y-3">
                {dash!.eventos_recentes.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TIPO_COR[ev.tipo]}`}>
                      {TIPO_LABEL[ev.tipo]}
                    </span>
                    <span className="text-sm text-gray-700 font-medium">
                      {ev.animal?.brinco ?? "—"}{ev.animal?.nome ? ` — ${ev.animal.nome}` : ""}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{fmt(ev.data_evento)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO */}
      {aba === "historico" && (
        <div className="space-y-3">
          {/* Filtro */}
          <div className="flex gap-2 flex-wrap">
            {["", ...Object.keys(TIPO_LABEL)].map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filtroTipo === t ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t === "" ? "Todos" : TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          {eventosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-3xl mb-3">🧬</p>
              <p className="text-gray-500">Nenhum evento reprodutivo registrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                    <th className="text-left px-5 py-3">Animal</th>
                    <th className="text-left px-3 py-3">Evento</th>
                    <th className="text-left px-3 py-3 hidden sm:table-cell">Detalhe</th>
                    <th className="text-left px-3 py-3">Resultado</th>
                    <th className="text-left px-3 py-3">Data</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {eventosFiltrados.map(ev => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{ev.animal?.brinco ?? "—"}</p>
                        <p className="text-xs text-gray-400">{ev.animal?.raca}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_COR[ev.tipo]}`}>
                          {TIPO_LABEL[ev.tipo]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 hidden sm:table-cell">
                        {ev.touro_brinco && `Touro: ${ev.touro_brinco}`}
                        {ev.semen_codigo && `Sêmen: ${ev.semen_codigo}`}
                        {ev.peso_bezerro && `Bezerro: ${ev.peso_bezerro}kg (${ev.sexo_bezerro})`}
                        {!ev.touro_brinco && !ev.semen_codigo && !ev.peso_bezerro && "—"}
                      </td>
                      <td className="px-3 py-3">
                        {ev.resultado === null ? "—" : ev.resultado
                          ? <span className="text-xs font-semibold text-green-600">✓ Positivo</span>
                          : <span className="text-xs font-semibold text-red-500">✗ Negativo</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">{fmt(ev.data_evento)}</td>
                      <td className="px-3 py-3">
                        <button onClick={async () => {
                          if (!confirm("Remover este evento?")) return;
                          await api.delete(`/gestao/reproducao/${ev.id}`);
                          carregar();
                        }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      )}

      {/* PRÓXIMOS PARTOS */}
      {aba === "partos" && (
        <div className="space-y-3">
          {partos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-3xl mb-3">🍼</p>
              <p className="text-gray-500">Nenhum parto esperado nos próximos 60 dias</p>
              <p className="text-gray-400 text-sm mt-1">Registre coberturas/IATF confirmadas para acompanhar</p>
            </div>
          ) : partos.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${p.dias_restantes <= 7 ? "border-red-200 bg-red-50" : p.dias_restantes <= 20 ? "border-amber-200 bg-amber-50" : "border-gray-100"}`}>
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${p.dias_restantes <= 7 ? "bg-red-100" : p.dias_restantes <= 20 ? "bg-amber-100" : "bg-green-50"}`}>
                <span className="text-lg leading-none">🍼</span>
                <span className={`text-[10px] font-bold mt-0.5 ${p.dias_restantes <= 7 ? "text-red-600" : p.dias_restantes <= 20 ? "text-amber-700" : "text-green-700"}`}>{p.dias_restantes}d</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">
                  {p.animal?.brinco ?? "—"}{p.animal?.nome ? ` — ${p.animal.nome}` : ""}
                </p>
                <p className="text-xs text-gray-500">{p.animal?.raca}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cobertura: {fmt(p.data_cobertura)}
                  {p.touro_brinco && ` · Touro: ${p.touro_brinco}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-700">{fmt(p.parto_esperado)}</p>
                <p className="text-xs text-gray-400">Parto previsto</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <EventoModal onClose={() => setShowForm(false)} onDone={carregar} />}
    </div>
  );
}

function EventoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    brinco:       "",
    animal_id:    "",
    tipo:         "cobertura",
    data_evento:  new Date().toISOString().split("T")[0],
    resultado:    "",
    touro_brinco: "",
    semen_codigo: "",
    peso_bezerro: "",
    sexo_bezerro: "",
    observacao:   "",
  });
  const [animais, setAnimais]   = useState<Animal[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [erro, setErro]         = useState("");

  async function buscarAnimal(q: string) {
    if (q.length < 2) { setAnimais([]); return; }
    setBuscando(true);
    const { data } = await api.get(`/gestao/rebanho?brinco=${encodeURIComponent(q)}&sexo=femea&per_page=8`).catch(() => ({ data: [] }));
    setAnimais(Array.isArray(data) ? data : (data?.data ?? []));
    setBuscando(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animal_id) { setErro("Selecione um animal."); return; }
    setSaving(true); setErro("");
    try {
      await api.post("/gestao/reproducao", {
        animal_id:    parseInt(form.animal_id),
        tipo:         form.tipo,
        data_evento:  form.data_evento,
        resultado:    form.resultado === "" ? null : form.resultado === "true",
        touro_brinco: form.touro_brinco || null,
        semen_codigo: form.semen_codigo || null,
        peso_bezerro: form.peso_bezerro ? parseFloat(form.peso_bezerro) : null,
        sexo_bezerro: form.sexo_bezerro || null,
        observacao:   form.observacao || null,
      });
      onDone(); onClose();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao salvar.");
      setSaving(false);
    }
  }

  const precisaTouro   = ["cobertura", "iatf"].includes(form.tipo);
  const precisaResult  = ["cobertura", "iatf", "diagnostico_prenhez"].includes(form.tipo);
  const precisaBezerro = form.tipo === "parto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">🧬 Registrar Evento Reprodutivo</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo de evento</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, resultado: "", touro_brinco: "", semen_codigo: "", peso_bezerro: "", sexo_bezerro: "" })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Animal (busca por brinco) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Animal (fêmea)</label>
            {form.animal_id ? (
              <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2">
                <span className="text-sm font-semibold text-pink-800 flex-1">{form.brinco}</span>
                <button type="button" onClick={() => setForm({ ...form, animal_id: "", brinco: "" })}
                  className="text-pink-400 hover:text-pink-600 text-xs">trocar</button>
              </div>
            ) : (
              <div>
                <input value={form.brinco} onChange={e => { setForm({ ...form, brinco: e.target.value, animal_id: "" }); buscarAnimal(e.target.value); }}
                  placeholder="Buscar por brinco ou nome..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                {buscando && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                {animais.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mt-1 max-h-32 overflow-y-auto">
                    {animais.map(a => (
                      <button key={a.id} type="button"
                        onClick={() => { setForm({ ...form, animal_id: String(a.id), brinco: `${a.brinco ?? "Sem brinco"} — ${a.nome ?? a.raca}` }); setAnimais([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        <span className="font-semibold">{a.brinco ?? "Sem brinco"}</span>
                        {a.nome && <span className="text-gray-500"> — {a.nome}</span>}
                        <span className="text-gray-400 text-xs ml-2">{a.raca}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Data do evento</label>
            <input type="date" value={form.data_evento} onChange={e => setForm({ ...form, data_evento: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>

          {/* Touro / Sêmen */}
          {precisaTouro && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Brinco do touro</label>
                <input value={form.touro_brinco} onChange={e => setForm({ ...form, touro_brinco: e.target.value })}
                  placeholder="Opcional"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Código do sêmen</label>
                <input value={form.semen_codigo} onChange={e => setForm({ ...form, semen_codigo: e.target.value })}
                  placeholder="Opcional"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
            </div>
          )}

          {/* Resultado */}
          {precisaResult && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Resultado</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: "", l: "Pendente" }, { v: "true", l: "✓ Prenha/Positivo" }, { v: "false", l: "✗ Vazia/Negativo" }].map(o => (
                  <button key={o.v} type="button" onClick={() => setForm({ ...form, resultado: o.v })}
                    className={`py-2 rounded-xl border text-xs font-semibold transition ${form.resultado === o.v ? "bg-pink-50 border-pink-400 text-pink-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bezerro */}
          {precisaBezerro && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Peso do bezerro (kg)</label>
                <input type="number" step="0.1" value={form.peso_bezerro} onChange={e => setForm({ ...form, peso_bezerro: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Sexo do bezerro</label>
                <select value={form.sexo_bezerro} onChange={e => setForm({ ...form, sexo_bezerro: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="">—</option>
                  <option value="macho">Macho</option>
                  <option value="femea">Fêmea</option>
                </select>
              </div>
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Observação (opcional)</label>
            <textarea rows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
          </div>

          {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
