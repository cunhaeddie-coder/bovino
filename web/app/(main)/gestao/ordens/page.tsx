"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type AnimalRebanho = {
  id: number; brinco: string | null; nome: string | null;
  raca: string; sexo: "macho" | "femea"; categoria: string;
  data_nascimento: string | null; peso_atual: number | null;
};

type ItemOS = {
  id: number; animal_id: number; status: "pendente" | "feito" | "nao_realizado";
  peso_execucao: number | null; observacao: string | null;
  executado_em: string | null;
  animal: AnimalRebanho;
  pastagem_destino?: { id: number; nome: string } | null;
};

type OS = {
  id: number; nome: string; finalidade: string; status: string;
  instrucoes: string | null; publicado_em: string | null;
  animais_count: number; feitos_count: number;
  vaqueiro?: { id: number; nome: string; papel: string; telefone: string | null } | null;
  pastagem_destino?: { id: number; nome: string } | null;
  animais?: ItemOS[];
  created_at: string;
};

type Funcionario = { id: number; nome: string; papel: string; cargo: string };
type Pastagem    = { id: number; nome: string };
type Stats = { total: number; rascunho: number; aguardando: number; em_andamento: number; parcial: number; concluido: number };

// ── Constantes ────────────────────────────────────────────────────────────────

const FINALIDADES: { value: string; label: string; icon: string; categorias: string[] }[] = [
  { value: "desmama",            label: "Desmama",              icon: "🍼", categorias: ["bezerro","bezerra"] },
  { value: "vacinacao",          label: "Vacinação",            icon: "💉", categorias: [] },
  { value: "pesagem",            label: "Pesagem",              icon: "⚖️", categorias: [] },
  { value: "transferencia_pasto",label: "Transferência de pasto",icon: "🌿", categorias: [] },
  { value: "engorda",            label: "Engorda",              icon: "📈", categorias: ["novilho","novilha","boi"] },
  { value: "iatf",               label: "IATF",                 icon: "🧬", categorias: ["vaca","novilha"] },
  { value: "cobertura",          label: "Cobertura natural",    icon: "🐂", categorias: ["vaca","novilha"] },
  { value: "diagnostico_prenhez",label: "Diagnóstico prenhez",  icon: "🔬", categorias: ["vaca","novilha"] },
  { value: "descarte",           label: "Descarte",             icon: "🗑️", categorias: [] },
  { value: "venda_marketplace",  label: "Venda — Marketplace",  icon: "🛒", categorias: [] },
  { value: "venda_direta",       label: "Venda direta",         icon: "🤝", categorias: [] },
  { value: "frigorifico",        label: "Frigorífico",          icon: "🥩", categorias: ["boi","novilho","vaca"] },
  { value: "marcacao_brinco",    label: "Marcação / Brinco",    icon: "🏷️", categorias: [] },
  { value: "outro",              label: "Outro",                icon: "📌", categorias: [] },
];

const STATUS_COR: Record<string, string> = {
  rascunho:     "bg-gray-100 text-gray-600",
  aguardando:   "bg-yellow-100 text-yellow-700",
  em_andamento: "bg-blue-100 text-blue-700",
  parcial:      "bg-orange-100 text-orange-700",
  concluido:    "bg-green-100 text-green-700",
  cancelado:    "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho:"Rascunho", aguardando:"Aguardando", em_andamento:"Em andamento",
  parcial:"Parcial", concluido:"Concluído", cancelado:"Cancelado",
};

const ITEM_STATUS_COR: Record<string, string> = {
  pendente:      "bg-gray-100 text-gray-500",
  feito:         "bg-green-100 text-green-700",
  nao_realizado: "bg-red-100 text-red-600",
};

function finalidadeInfo(v: string) {
  return FINALIDADES.find(f => f.value === v) ?? { label: v, icon: "📌", categorias: [] };
}

function idadeTexto(d: string | null) {
  if (!d) return "—";
  const m = Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24*30.44));
  return m < 12 ? `${m}m` : `${Math.floor(m/12)}a`;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function OrdensServicoPage() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [ordens, setOrdens]         = useState<OS[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetalhe, setShowDetalhe] = useState<OS | null>(null);
  const [salvando, setSalvando]     = useState(false);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro]             = useState("");

  // Create form
  const [step, setStep]             = useState<1|2|3>(1);
  const [formNome, setFormNome]     = useState("");
  const [formFinalidade, setFormFinalidade] = useState("");
  const [formVaqueiro, setFormVaqueiro]     = useState("");
  const [formPastagem, setFormPastagem]     = useState("");
  const [formInstrucoes, setFormInstrucoes] = useState("");
  const [selecionados, setSelecionados]     = useState<number[]>([]);

  // Lookup data
  const [animaisDisponiveis, setAnimaisDisponiveis] = useState<AnimalRebanho[]>([]);
  const [funcionarios, setFuncionarios]             = useState<Funcionario[]>([]);
  const [pastagens, setPastagens]                   = useState<Pastagem[]>([]);
  const [buscaAnimal, setBuscaAnimal]               = useState("");
  const [filtroCat, setFiltroCat]                   = useState("");
  const [loadingAnimais, setLoadingAnimais]         = useState(false);

  // Detalhe: item status
  const [itemStatus, setItemStatus] = useState<Record<number, { status: string; peso: string; obs: string }>>({});

  const carregarTudo = useCallback(() => {
    setLoading(true);
    const p = filtroStatus ? `?status=${filtroStatus}` : "";
    Promise.all([
      api.get(`/gestao/ordens${p}`),
      api.get("/gestao/ordens/estatisticas"),
    ]).then(([r1, r2]) => {
      setOrdens(r1.data.data ?? r1.data);
      setStats(r2.data);
    }).finally(() => setLoading(false));
  }, [filtroStatus]);

  useEffect(() => { carregarTudo(); }, [carregarTudo]);

  function abrirCreate() {
    setStep(1); setFormNome(""); setFormFinalidade(""); setFormVaqueiro("");
    setFormPastagem(""); setFormInstrucoes(""); setSelecionados([]);
    setBuscaAnimal(""); setFiltroCat(""); setErro("");
    setShowCreate(true);
    carregarLookups();
  }

  function carregarLookups() {
    api.get("/gestao/funcionarios").then(r => setFuncionarios(r.data.data ?? r.data)).catch(() => {});
    api.get("/gestao/pasto/mapa").then(r => {
      const lista = Array.isArray(r.data) ? r.data : (r.data.data ?? []);
      setPastagens(lista);
    }).catch(() => {});
  }

  useEffect(() => {
    if (!showCreate || step !== 2) return;
    setLoadingAnimais(true);
    const p = new URLSearchParams({ status: "ativo" });
    if (filtroCat) p.set("categoria", filtroCat);
    if (buscaAnimal) p.set("brinco", buscaAnimal);
    api.get(`/gestao/rebanho?${p}&per_page=100`)
      .then(r => setAnimaisDisponiveis(r.data.data ?? r.data))
      .finally(() => setLoadingAnimais(false));
  }, [showCreate, step, filtroCat, buscaAnimal]);

  // Sugestão de categoria para a finalidade escolhida
  const catSugerida = formFinalidade ? finalidadeInfo(formFinalidade).categorias[0] ?? "" : "";
  useEffect(() => {
    if (catSugerida && !filtroCat) setFiltroCat(catSugerida);
  }, [catSugerida]);

  async function criarOS(publicar: boolean) {
    setErro(""); setSalvando(true);
    try {
      const nome = formNome.trim() ||
        `OS — ${finalidadeInfo(formFinalidade).label} — ${new Date().toLocaleDateString("pt-BR")}`;
      const { data } = await api.post("/gestao/ordens", {
        nome, finalidade: formFinalidade, instrucoes: formInstrucoes || null,
        atribuido_a: formVaqueiro || null,
        pastagem_destino_id: formPastagem || null,
        animal_ids: selecionados,
      });
      if (publicar) await api.post(`/gestao/ordens/${data.id}/publicar`);
      setShowCreate(false);
      carregarTudo();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErro(err.response?.data?.message ?? "Erro ao criar OS.");
    } finally { setSalvando(false); }
  }

  async function publicarOS(id: number) {
    await api.post(`/gestao/ordens/${id}/publicar`);
    carregarTudo();
    if (showDetalhe?.id === id) abrirDetalhe(id);
  }

  async function cancelarOS(id: number) {
    if (!confirm("Cancelar esta OS?")) return;
    await api.delete(`/gestao/ordens/${id}`);
    carregarTudo();
    setShowDetalhe(null);
  }

  async function abrirDetalhe(id: number) {
    const { data } = await api.get(`/gestao/ordens/${id}`);
    setShowDetalhe(data);
    const map: Record<number, { status: string; peso: string; obs: string }> = {};
    (data.animais ?? []).forEach((i: ItemOS) => {
      map[i.animal_id] = { status: i.status, peso: String(i.peso_execucao ?? ""), obs: i.observacao ?? "" };
    });
    setItemStatus(map);
  }

  async function salvarAnimal(osId: number, animalId: number) {
    const s = itemStatus[animalId];
    if (!s) return;
    await api.put(`/gestao/ordens/${osId}/animais/${animalId}`, {
      status: s.status,
      peso_execucao: s.peso ? parseFloat(s.peso) : null,
      observacao: s.obs || null,
    });
    abrirDetalhe(osId);
    carregarTudo();
  }

  async function executarOS(id: number) {
    setExecutando(true);
    try {
      await api.post(`/gestao/ordens/${id}/executar`);
      abrirDetalhe(id);
      carregarTudo();
    } finally { setExecutando(false); }
  }

  const needsPastagem = ["transferencia_pasto", "engorda", "desmama"].includes(formFinalidade);
  const needsVaqueiro = formFinalidade !== "";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base md:text-xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="text-sm text-gray-500 mt-0.5">Crie, atribua e acompanhe tarefas do rebanho</p>
        </div>
        <button onClick={abrirCreate}
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Nova OS
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            ["Total", stats.total, "text-gray-700"],
            ["Rascunho", stats.rascunho, "text-gray-500"],
            ["Aguardando", stats.aguardando, "text-yellow-600"],
            ["Andamento", stats.em_andamento, "text-blue-600"],
            ["Parcial", stats.parcial, "text-orange-600"],
            ["Concluídas", stats.concluido, "text-green-600"],
          ].map(([label, val, cor]) => (
            <div key={label as string} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className={`text-xl font-extrabold ${cor}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por status */}
      <div className="flex gap-2 flex-wrap">
        {[["", "Todas"], ["rascunho","Rascunho"], ["aguardando","Aguardando"],
          ["em_andamento","Em andamento"], ["parcial","Parcial"], ["concluido","Concluídas"]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filtroStatus === v ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
            }`}>{l}</button>
        ))}
      </div>

      {/* Lista de OS */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="bg-gray-100 h-20 rounded-2xl animate-pulse"/>)}</div>
      ) : ordens.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-gray-500 font-medium">Nenhuma OS encontrada</p>
          <button onClick={abrirCreate} className="mt-3 text-green-700 text-sm font-semibold hover:underline">
            Criar a primeira OS →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ordens.map(os => {
            const fi = finalidadeInfo(os.finalidade);
            const pct = os.animais_count > 0 ? Math.round(os.feitos_count / os.animais_count * 100) : 0;
            return (
              <div key={os.id} onClick={() => abrirDetalhe(os.id)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-green-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl shrink-0 border border-gray-100">
                    {fi.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 truncate">{os.nome}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COR[os.status]}`}>
                        {STATUS_LABEL[os.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fi.label} · {os.animais_count} animal{os.animais_count !== 1 ? "is" : ""}
                      {os.vaqueiro && ` · ${os.vaqueiro.nome}`}
                      {os.pastagem_destino && ` · → ${os.pastagem_destino.nome}`}
                    </p>
                    {os.animais_count > 0 && os.status !== "rascunho" && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{os.feitos_count}/{os.animais_count}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 shrink-0">
                    {new Date(os.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Criar OS ───────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">Nova Ordem de Serviço</h2>
                <p className="text-xs text-gray-400 mt-0.5">Passo {step} de 3</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Progress */}
            <div className="flex h-1 shrink-0">
              {[1,2,3].map(s => (
                <div key={s} className={`flex-1 transition-colors ${step >= s ? "bg-green-500" : "bg-gray-100"}`}/>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

              {/* Passo 1: Finalidade + Nome */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-600">Qual é a finalidade desta OS?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FINALIDADES.map(f => (
                      <button key={f.value} onClick={() => setFormFinalidade(f.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          formFinalidade === f.value
                            ? "border-green-500 bg-green-50 ring-1 ring-green-400"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}>
                        <span className="text-lg">{f.icon}</span>
                        <span className="text-xs font-semibold text-gray-700 leading-tight">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  {formFinalidade && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">
                        Nome da OS <span className="text-gray-400 font-normal">(deixe vazio para gerar automaticamente)</span>
                      </label>
                      <input value={formNome} onChange={e => setFormNome(e.target.value)}
                        placeholder={`OS — ${finalidadeInfo(formFinalidade).label} — ${new Date().toLocaleDateString("pt-BR")}`}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                  )}
                </div>
              )}

              {/* Passo 2: Selecionar animais */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-600">
                    Selecione os animais
                    {finalidadeInfo(formFinalidade).categorias.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-green-600">
                        (sugestão: {finalidadeInfo(formFinalidade).categorias.join(", ")})
                      </span>
                    )}
                  </p>

                  <div className="flex gap-2">
                    <input value={buscaAnimal} onChange={e => setBuscaAnimal(e.target.value)}
                      placeholder="Buscar por brinco..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Todas categorias</option>
                      {["bezerro","bezerra","novilho","novilha","touro","vaca","boi"].map(c =>
                        <option key={c} value={c}>{c}</option>
                      )}
                    </select>
                  </div>

                  {selecionados.length > 0 && (
                    <p className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                      {selecionados.length} animal{selecionados.length !== 1 ? "is" : ""} selecionado{selecionados.length !== 1 ? "s" : ""}
                      <button onClick={() => setSelecionados([])} className="ml-2 text-red-400 hover:text-red-600">✕ limpar</button>
                    </p>
                  )}

                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {loadingAnimais ? (
                      <div className="p-4 text-center text-sm text-gray-400">Carregando...</div>
                    ) : animaisDisponiveis.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">Nenhum animal encontrado</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-100">
                          <input type="checkbox"
                            checked={selecionados.length === animaisDisponiveis.length && animaisDisponiveis.length > 0}
                            onChange={e => setSelecionados(e.target.checked ? animaisDisponiveis.map(a => a.id) : [])}
                            className="w-4 h-4 accent-green-600"/>
                          <span className="text-xs text-gray-500">Selecionar todos ({animaisDisponiveis.length})</span>
                        </div>
                        {animaisDisponiveis.map(a => (
                          <label key={a.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <input type="checkbox" checked={selecionados.includes(a.id)}
                              onChange={e => setSelecionados(prev => e.target.checked ? [...prev, a.id] : prev.filter(i => i !== a.id))}
                              className="w-4 h-4 accent-green-600 shrink-0"/>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                {a.brinco ?? "Sem brinco"}{a.nome ? ` — ${a.nome}` : ""}
                              </p>
                              <p className="text-xs text-gray-400">
                                {a.raca} · {a.categoria} · {a.sexo === "femea" ? "♀" : "♂"} · {idadeTexto(a.data_nascimento)} · {a.peso_atual ? `${a.peso_atual}kg` : "sem peso"}
                              </p>
                            </div>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Passo 3: Responsável + Detalhes */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Vaqueiro responsável{" "}
                      <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <select value={formVaqueiro} onChange={e => setFormVaqueiro(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">— Sem responsável atribuído</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
                      ))}
                    </select>
                  </div>

                  {needsPastagem && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">
                        Pastagem / Piquete destino
                      </label>
                      <select value={formPastagem} onChange={e => setFormPastagem(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">— Vaqueiro informa no momento</option>
                        {pastagens.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Instruções</label>
                    <textarea value={formInstrucoes} onChange={e => setFormInstrucoes(e.target.value)}
                      rows={4} placeholder="Descreva o que precisa ser feito, cuidados especiais, sequência..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"/>
                  </div>

                  {/* Resumo */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Resumo da OS</p>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Finalidade</span>
                      <span className="font-medium">{finalidadeInfo(formFinalidade).icon} {finalidadeInfo(formFinalidade).label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Animais</span>
                      <span className="font-medium">{selecionados.length} selecionado{selecionados.length !== 1 ? "s" : ""}</span>
                    </div>
                    {formVaqueiro && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vaqueiro</span>
                        <span className="font-medium">{funcionarios.find(f => String(f.id) === formVaqueiro)?.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
              {step > 1 && (
                <button onClick={() => setStep(s => (s - 1) as 1|2|3)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  Voltar
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !formFinalidade) { setErro("Escolha uma finalidade."); return; }
                    if (step === 2 && selecionados.length === 0) { setErro("Selecione ao menos 1 animal."); return; }
                    setErro(""); setStep(s => (s + 1) as 2|3);
                  }}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800">
                  Próximo
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <button onClick={() => criarOS(false)} disabled={salvando}
                    className="flex-1 border border-green-600 text-green-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-50 disabled:opacity-60">
                    {salvando ? "Salvando..." : "Salvar rascunho"}
                  </button>
                  <button onClick={() => criarOS(true)} disabled={salvando}
                    className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                    {salvando ? "..." : "Publicar OS"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detalhe OS ─────────────────────────────────────────────── */}
      {showDetalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{finalidadeInfo(showDetalhe.finalidade).icon}</span>
                  <h2 className="font-bold text-gray-900 truncate">{showDetalhe.nome}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COR[showDetalhe.status]}`}>
                    {STATUS_LABEL[showDetalhe.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {finalidadeInfo(showDetalhe.finalidade).label}
                  {showDetalhe.vaqueiro && ` · Vaqueiro: ${showDetalhe.vaqueiro.nome}`}
                  {showDetalhe.pastagem_destino && ` · Destino: ${showDetalhe.pastagem_destino.nome}`}
                </p>
                {showDetalhe.instrucoes && (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">{showDetalhe.instrucoes}</p>
                )}
              </div>
              <button onClick={() => setShowDetalhe(null)} className="text-gray-400 hover:text-gray-600 ml-3 shrink-0">✕</button>
            </div>

            {/* Progresso */}
            {showDetalhe.animais && showDetalhe.animais_count > 0 && showDetalhe.status !== "rascunho" && (
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-full rounded-full transition-all"
                      style={{ width: `${showDetalhe.animais_count > 0 ? Math.round(showDetalhe.feitos_count / showDetalhe.animais_count * 100) : 0}%` }}/>
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">
                    {showDetalhe.feitos_count}/{showDetalhe.animais_count}
                  </span>
                </div>
              </div>
            )}

            {/* Lista de animais */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(showDetalhe.animais ?? []).map(item => {
                const local = itemStatus[item.animal_id] ?? { status: item.status, peso: "", obs: "" };
                const needsPeso = ["pesagem","frigorifico"].includes(showDetalhe.finalidade);
                const needsObs  = ["diagnostico_prenhez","descarte"].includes(showDetalhe.finalidade);
                const editable  = !["concluido","cancelado"].includes(showDetalhe.status);

                return (
                  <div key={item.id} className={`rounded-xl border p-3 space-y-2 ${
                    local.status === "feito" ? "border-green-200 bg-green-50" :
                    local.status === "nao_realizado" ? "border-red-200 bg-red-50" :
                    "border-gray-200 bg-white"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {item.animal?.brinco ?? "Sem brinco"}
                          {item.animal?.nome ? ` — ${item.animal.nome}` : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.animal?.raca} · {item.animal?.categoria} ·{" "}
                          {item.animal?.sexo === "femea" ? "♀" : "♂"} ·{" "}
                          {idadeTexto(item.animal?.data_nascimento ?? null)} ·{" "}
                          {item.animal?.peso_atual ? `${item.animal.peso_atual}kg` : "sem peso"}
                        </p>
                      </div>
                      {editable ? (
                        <select
                          value={local.status}
                          onChange={e => setItemStatus(prev => ({ ...prev, [item.animal_id]: { ...local, status: e.target.value } }))}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 ${ITEM_STATUS_COR[local.status]}`}>
                          <option value="pendente">Pendente</option>
                          <option value="feito">Feito</option>
                          <option value="nao_realizado">Não realizado</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${ITEM_STATUS_COR[item.status]}`}>
                          {item.status === "feito" ? "Feito" : item.status === "nao_realizado" ? "Não realizado" : "Pendente"}
                        </span>
                      )}
                    </div>

                    {editable && local.status === "feito" && (
                      <div className="flex gap-2">
                        {needsPeso && (
                          <input type="number" value={local.peso}
                            onChange={e => setItemStatus(prev => ({ ...prev, [item.animal_id]: { ...local, peso: e.target.value } }))}
                            placeholder="Peso (kg)" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                        )}
                        {needsObs && (
                          <input value={local.obs}
                            onChange={e => setItemStatus(prev => ({ ...prev, [item.animal_id]: { ...local, obs: e.target.value } }))}
                            placeholder={showDetalhe.finalidade === "diagnostico_prenhez" ? "prenha / vazia" : "motivo"}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                        )}
                        <button onClick={() => salvarAnimal(showDetalhe.id, item.animal_id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">
                          Salvar
                        </button>
                      </div>
                    )}

                    {item.executado_em && (
                      <p className="text-xs text-gray-400">
                        Executado em {new Date(item.executado_em).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ações */}
            <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0 flex-wrap">
              {showDetalhe.status === "rascunho" && (
                <button onClick={() => publicarOS(showDetalhe.id)}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800">
                  Publicar OS
                </button>
              )}
              {["aguardando","em_andamento","parcial"].includes(showDetalhe.status) && (
                <button onClick={() => executarOS(showDetalhe.id)} disabled={executando}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {executando ? "Executando..." : "Executar integrações"}
                </button>
              )}
              {!["concluido","cancelado"].includes(showDetalhe.status) && (
                <button onClick={() => cancelarOS(showDetalhe.id)}
                  className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
