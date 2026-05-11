"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Pastagem = { id: number; nome: string; area_ha: number | null; tipo: string | null; capacidade: number | null; lotes_count: number; ocupada: boolean; posicao_x: number | null; posicao_y: number | null };
type Lote     = { id: number; nome: string; raca: string; qtd_cabecas: number };
type Troca    = { id: number; data_troca: string; lote: { nome: string }; pastagOrigem: { nome: string } | null; pastagDestino: { nome: string } };
type Aplicacao = { id: number; descricao: string; tipo: string; quantidade_total: number; unidade: string; custo_total: number | null; data_aplicacao: string; lote: { nome: string } | null; pastagem: { nome: string } | null };
type Template  = { id: number; nome: string; descricao: string | null; campos: Campo[] };
type Campo     = { nome: string; tipo: "numero" | "texto" | "opcao" | "escala" | "booleano"; opcoes?: string[]; obrigatorio?: boolean };

const TIPO_PASTO_COR: Record<string, string> = {
  brachiaria: "bg-green-100 border-green-300",
  panicum:    "bg-emerald-100 border-emerald-300",
  bermuda:    "bg-lime-100 border-lime-300",
  default:    "bg-gray-100 border-gray-300",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PastoPage() {
  const [pastagens, setPastagens]   = useState<Pastagem[]>([]);
  const [lotes, setLotes]           = useState<Lote[]>([]);
  const [trocas, setTrocas]         = useState<Troca[]>([]);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [aba, setAba]               = useState<"mapa"|"trocas"|"nutricao"|"coletas">("mapa");
  const [loading, setLoading]       = useState(true);
  const [showTroca, setShowTroca]   = useState(false);
  const [showAplicacao, setShowAplicacao] = useState(false);
  const [showTemplate, setShowTemplate]   = useState(false);
  const [showColeta, setShowColeta]       = useState<Template | null>(null);
  const [loteDestaque, setLoteDestaque]   = useState<Pastagem | null>(null);
  const [showPastagem, setShowPastagem]   = useState(false);
  const [editandoPastagem, setEditandoPastagem] = useState<Pastagem | null>(null);

  async function carregar() {
    setLoading(true);
    const toArr = (v: unknown) => Array.isArray(v) ? v : ((v as any)?.data ?? []);
    const [mapa, tr, ap, tmpl, lt] = await Promise.all([
      api.get("/gestao/pasto/mapa").then(r => r.data).catch(() => []),
      api.get("/gestao/pasto/trocas").then(r => r.data.data || []).catch(() => []),
      api.get("/gestao/pasto/aplicacoes").then(r => r.data.data || []).catch(() => []),
      api.get("/gestao/pasto/templates").then(r => r.data).catch(() => []),
      api.get("/gestao/lotes").then(r => r.data).catch(() => []),
    ]);
    setPastagens(toArr(mapa)); setTrocas(tr); setAplicacoes(ap); setTemplates(toArr(tmpl)); setLotes(toArr(lt));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Pasto</h1>
          <p className="text-gray-500 text-sm">Mapa de pastagens, rotação, nutrição e coletas</p>
        </div>
        <div className="flex gap-2">
          {aba === "mapa"     && <button onClick={() => { setEditandoPastagem(null); setShowPastagem(true); }} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Nova pastagem</button>}
          {aba === "trocas"   && <button onClick={() => setShowTroca(true)}    className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Troca de piquete</button>}
          {aba === "nutricao" && <button onClick={() => setShowAplicacao(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Aplicação</button>}
          {aba === "coletas"  && <button onClick={() => setShowTemplate(true)}  className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Novo template</button>}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { k: "mapa",    label: "🗺️ Mapa" },
          { k: "trocas",  label: "🔄 Rotação" },
          { k: "nutricao",label: "🌿 Nutrição" },
          { k: "coletas", label: "📊 Coletas" },
        ] as const).map(({ k, label }) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${aba === k ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* MAPA VISUAL DE PASTAGENS */}
      {aba === "mapa" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Pastagens / Piquetes</h2>
              <span className="text-xs text-gray-400">{pastagens.length} piquete(s) cadastrado(s)</span>
            </div>
            {pastagens.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🌿</p>
                <p className="text-gray-500 text-sm font-medium">Nenhuma pastagem cadastrada</p>
                <p className="text-gray-400 text-xs mt-1 mb-4">Cadastre seus piquetes para usar rotação e nutrição</p>
                <button
                  onClick={() => { setEditandoPastagem(null); setShowPastagem(true); }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition">
                  + Cadastrar primeira pastagem
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pastagens.map(p => {
                  const cor = TIPO_PASTO_COR[p.tipo ?? ""] ?? TIPO_PASTO_COR.default;
                  const isDestaque = loteDestaque?.id === p.id;
                  return (
                    <div key={p.id} className={`relative rounded-2xl border-2 p-4 transition-all ${cor} ${isDestaque ? "ring-4 ring-green-400 scale-105 shadow-lg" : "hover:shadow-md"}`}>
                      <button className="absolute top-2 right-2 text-[10px] text-gray-400 hover:text-gray-600 bg-white/70 rounded px-1.5 py-0.5"
                        onClick={() => { setEditandoPastagem(p); setShowPastagem(true); }}>
                        editar
                      </button>
                      <button className="w-full text-left" onClick={() => setLoteDestaque(isDestaque ? null : p)}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{p.ocupada ? "🐄" : "🌿"}</span>
                          {p.ocupada && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full mr-8">OCUPADA</span>}
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate">{p.nome}</p>
                        {p.area_ha && <p className="text-xs text-gray-500">{p.area_ha} ha</p>}
                        {p.tipo && <p className="text-xs text-gray-400 capitalize">{p.tipo}</p>}
                        {p.capacidade && <p className="text-xs text-gray-500">Cap: {p.capacidade} cab.</p>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {loteDestaque && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800">{loteDestaque.nome}</p>
                    <p className="text-xs text-green-600">
                      {loteDestaque.area_ha ? `${loteDestaque.area_ha} ha · ` : ""}
                      {loteDestaque.ocupada ? "Piquete em uso" : "Disponível para uso"}
                    </p>
                  </div>
                  <button onClick={() => { setShowTroca(true); setLoteDestaque(null); }}
                    className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold">
                    Mover lote aqui
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KPIs pastagens */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xl mb-1">🌿</p>
              <p className="text-xl font-bold text-gray-900">{pastagens.filter(p => !p.ocupada).length}</p>
              <p className="text-xs text-gray-400">Em descanso</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xl mb-1">🐄</p>
              <p className="text-xl font-bold text-gray-900">{pastagens.filter(p => p.ocupada).length}</p>
              <p className="text-xs text-gray-400">Ocupadas</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xl mb-1">📐</p>
              <p className="text-xl font-bold text-gray-900">{pastagens.reduce((s, p) => s + (p.area_ha ?? 0), 0).toFixed(1)}</p>
              <p className="text-xs text-gray-400">Total ha</p>
            </div>
          </div>
        </div>
      )}

      {/* ROTAÇÃO */}
      {aba === "trocas" && (
        <div className="space-y-3">
          {trocas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🔄</p>
              <p className="text-gray-500">Nenhuma troca de piquete registrada</p>
              <p className="text-gray-400 text-sm mt-1">Registre as rotações do seu rebanho</p>
            </div>
          ) : trocas.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{t.lote?.nome}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded">{t.pastagOrigem?.nome ?? "Sem origem"}</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded">{t.pastagDestino?.nome}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{new Date(t.data_troca).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NUTRIÇÃO */}
      {aba === "nutricao" && (
        <div className="space-y-3">
          {aplicacoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🌿</p>
              <p className="text-gray-500">Nenhuma aplicação nutricional registrada</p>
            </div>
          ) : aplicacoes.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">{a.tipo}</span>
                  <p className="font-semibold text-gray-800 mt-1">{a.descricao}</p>
                  <p className="text-sm text-gray-500">{a.quantidade_total} {a.unidade}{a.lote ? ` · ${a.lote.nome}` : ""}{a.pastagem ? ` · ${a.pastagem.nome}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{new Date(a.data_aplicacao).toLocaleDateString("pt-BR")}</p>
                  {a.custo_total && <p className="font-semibold text-green-700 text-sm">{fmt(a.custo_total)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COLETAS PERSONALIZADAS */}
      {aba === "coletas" && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-500">Nenhum template de coleta criado</p>
              <p className="text-gray-400 text-sm mt-1">Crie templates como: escore de pasto, ECC, escore de fezes...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{t.nome}</p>
                      {t.descricao && <p className="text-xs text-gray-400 mt-0.5">{t.descricao}</p>}
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{t.campos.length} campos</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.campos.slice(0, 4).map((c, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{c.nome}</span>
                    ))}
                    {t.campos.length > 4 && <span className="text-[10px] text-gray-400">+{t.campos.length - 4}</span>}
                  </div>
                  <button onClick={() => setShowColeta(t)}
                    className="w-full py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold border border-green-200 transition">
                    Iniciar coleta
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPastagem   && <PastagensModal pastagem={editandoPastagem} onClose={() => setShowPastagem(false)} onDone={carregar} />}
      {showTroca      && <TrocaModal pastagens={pastagens} lotes={lotes} onClose={() => setShowTroca(false)} onDone={carregar} />}
      {showAplicacao  && <AplicacaoModal lotes={lotes} pastagens={pastagens} onClose={() => setShowAplicacao(false)} onDone={carregar} />}
      {showTemplate   && <TemplateModal onClose={() => setShowTemplate(false)} onDone={carregar} />}
      {showColeta     && <ColetaModal template={showColeta} lotes={lotes} pastagens={pastagens} onClose={() => setShowColeta(null)} onDone={carregar} />}
    </div>
  );
}

// ── Modais ─────────────────────────────────────────────────────────────────────

function PastagensModal({ pastagem, onClose, onDone }: { pastagem: Pastagem | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    nome:        pastagem?.nome        ?? "",
    area_ha:     pastagem?.area_ha     ? String(pastagem.area_ha) : "",
    tipo:        pastagem?.tipo        ?? "",
    capacidade:  pastagem?.capacidade  ? String(pastagem.capacidade) : "",
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = {
      nome:       form.nome,
      area_ha:    form.area_ha    ? parseFloat(form.area_ha)    : null,
      tipo:       form.tipo       || null,
      capacidade: form.capacidade ? parseInt(form.capacidade)   : null,
    };
    try {
      if (pastagem) {
        await api.put(`/gestao/pasto/pastagens/${pastagem.id}`, payload);
      } else {
        await api.post("/gestao/pasto/pastagens", payload);
      }
      onDone(); onClose();
    } catch { setSaving(false); }
  }

  async function deletar() {
    if (!pastagem) return;
    if (!confirm(`Remover "${pastagem.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try { await api.delete(`/gestao/pasto/pastagens/${pastagem.id}`); onDone(); onClose(); }
    catch { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">{pastagem ? "Editar pastagem" : "🌿 Nova pastagem / piquete"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do piquete / pastagem *</label>
            <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
              placeholder="Ex: Piquete 1, Brejo, Pastagem Norte..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Área (ha)</label>
              <input type="number" step="0.1" min="0" value={form.area_ha}
                onChange={e => setForm({...form, area_ha: e.target.value})}
                placeholder="Ex: 10.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Capacidade (cab.)</label>
              <input type="number" min="0" value={form.capacidade}
                onChange={e => setForm({...form, capacidade: e.target.value})}
                placeholder="Ex: 50"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo de forrageira</label>
            <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Não informado</option>
              <option value="brachiaria">Brachiaria</option>
              <option value="panicum">Panicum / Mombaça</option>
              <option value="bermuda">Bermuda / Tifton</option>
              <option value="andropogon">Andropogon</option>
              <option value="napier">Napier / Capineira</option>
              <option value="coast_cross">Coast Cross</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            {pastagem && (
              <button type="button" onClick={deletar} disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                {deleting ? "..." : "Remover"}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : pastagem ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrocaModal({ pastagens, lotes, onClose, onDone }: { pastagens: Pastagem[]; lotes: Lote[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ lote_id: "", pastagem_origem_id: "", pastagem_destino_id: "", data_troca: new Date().toISOString().split("T")[0], observacoes: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/pasto/trocas", form); onDone(); onClose(); }
    catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">🔄 Troca de Piquete</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Lote</label>
            <select required value={form.lote_id} onChange={e => setForm({...form, lote_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Selecione o lote</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.qtd_cabecas} cab.)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Piquete origem</label>
              <select value={form.pastagem_origem_id} onChange={e => setForm({...form, pastagem_origem_id: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">Sem origem</option>
                {pastagens.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Piquete destino *</label>
              <select required value={form.pastagem_destino_id} onChange={e => setForm({...form, pastagem_destino_id: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">Selecione</option>
                {pastagens.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Data da troca</label>
            <input type="date" value={form.data_troca} onChange={e => setForm({...form, data_troca: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Confirmar troca"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AplicacaoModal({ lotes, pastagens, onClose, onDone }: { lotes: Lote[]; pastagens: Pastagem[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", tipo: "suplemento", quantidade_total: "", unidade: "kg", custo_total: "", data_aplicacao: new Date().toISOString().split("T")[0], lote_id: "", pastagem_id: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/gestao/pasto/aplicacoes", { ...form, quantidade_total: parseFloat(form.quantidade_total), custo_total: form.custo_total || null, lote_id: form.lote_id || null, pastagem_id: form.pastagem_id || null });
      onDone(); onClose();
    } catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">🌿 Aplicação Nutricional</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Produto / descrição"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["suplemento","mineral","racao","sal","outro"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" value={form.data_aplicacao} onChange={e => setForm({...form, data_aplicacao: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input required type="number" step="0.001" min="0.001" value={form.quantidade_total} onChange={e => setForm({...form, quantidade_total: e.target.value})} placeholder="Quantidade"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["kg","g","L","mL","sc","un"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.lote_id} onChange={e => setForm({...form, lote_id: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Lote (opcional)</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <input type="number" step="0.01" value={form.custo_total} onChange={e => setForm({...form, custo_total: e.target.value})} placeholder="Custo total (R$)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Registrar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [nome, setNome]       = useState("");
  const [descricao, setDescricao] = useState("");
  const [campos, setCampos]   = useState<Campo[]>([{ nome: "", tipo: "numero" }]);
  const [saving, setSaving]   = useState(false);

  function addCampo() { setCampos([...campos, { nome: "", tipo: "numero" }]); }
  function removeCampo(i: number) { setCampos(campos.filter((_,idx) => idx !== i)); }
  function updateCampo(i: number, key: keyof Campo, val: string) {
    const n = [...campos]; (n[i] as any)[key] = val; setCampos(n);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/pasto/templates", { nome, descricao, campos }); onDone(); onClose(); }
    catch { setSaving(false); }
  }

  const SUGESTOES = ["Escore de pasto (1-5)","Escore de condição corporal","Escore de fezes","Escore de cocho","Altura do pasto (cm)","Cobertura (%)"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">📊 Novo Template de Coleta</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Templates comuns</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGESTOES.map(s => (
                <button key={s} type="button" onClick={() => setNome(s)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do template"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Campos</label>
              <button type="button" onClick={addCampo} className="text-xs text-green-700 hover:underline">+ Adicionar campo</button>
            </div>
            <div className="space-y-2">
              {campos.map((c, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-3">
                    <input value={c.nome} onChange={e => updateCampo(i, "nome", e.target.value)} placeholder={`Campo ${i+1}`} required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" />
                  </div>
                  <select value={c.tipo} onChange={e => updateCampo(i, "tipo", e.target.value)}
                    className="border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-400">
                    <option value="numero">Número</option>
                    <option value="escala">Escala</option>
                    <option value="texto">Texto</option>
                    <option value="opcao">Opções</option>
                    <option value="booleano">Sim/Não</option>
                  </select>
                  <button type="button" onClick={() => removeCampo(i)} className="text-red-400 hover:text-red-600 text-lg font-light text-center">×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Criar template"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ColetaModal({ template, lotes, pastagens, onClose, onDone }: { template: Template; lotes: Lote[]; pastagens: Pastagem[]; onClose: () => void; onDone: () => void }) {
  const [dados, setDados]       = useState<Record<string, string>>({});
  const [lote_id, setLoteId]    = useState("");
  const [pastagem_id, setPastagemId] = useState("");
  const [data_coleta, setData]  = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/gestao/pasto/templates/${template.id}/registros`, {
        dados, lote_id: lote_id || null, pastagem_id: pastagem_id || null, data_coleta,
      });
      onDone(); onClose();
    } catch { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-800">{template.nome}</h2>
            {template.descricao && <p className="text-xs text-gray-400">{template.descricao}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <select value={lote_id} onChange={e => setLoteId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Lote (opcional)</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <input type="date" value={data_coleta} onChange={e => setData(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          {template.campos.map((c, i) => (
            <div key={i}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                {c.nome}{c.obrigatorio ? " *" : ""}
              </label>
              {c.tipo === "booleano" ? (
                <div className="flex gap-3">
                  {["Sim","Não"].map(v => (
                    <button key={v} type="button" onClick={() => setDados({...dados, [c.nome]: v})}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${dados[c.nome] === v ? "bg-green-50 border-green-400 text-green-700" : "border-gray-200 text-gray-500"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              ) : c.tipo === "escala" ? (
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} type="button" onClick={() => setDados({...dados, [c.nome]: String(v)})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${dados[c.nome] === String(v) ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:border-green-300"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              ) : c.tipo === "numero" ? (
                <input type="number" step="0.1" value={dados[c.nome] ?? ""} onChange={e => setDados({...dados, [c.nome]: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              ) : (
                <input type="text" value={dados[c.nome] ?? ""} onChange={e => setDados({...dados, [c.nome]: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar coleta"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
