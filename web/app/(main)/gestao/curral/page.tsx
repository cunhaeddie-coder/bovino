"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Animal = { id: number; brinco: string; nome: string | null; raca: string; categoria: string; sexo: string; peso_atual: number | null };
type Lote   = { id: number; nome: string; raca: string; qtd_cabecas: number };
type PesagemLocal   = { animal_id: number; brinco: string; peso_kg: string; data: string };
type EventoLocal    = { tipo: string; descricao: string; animal_id?: number; data_evento: string; foto_base64?: string };
type Sessao = { id: number; data_sessao: string; descricao: string; status: string; total_animais: number; sincronizado_em: string | null };

const TIPOS_EVENTO = ["nascimento","morte","acidente","doença","fuga","cobertura","parto","cio","outros"];

type OrdemAnimal = {
  id: number; animal_id: number; status: string;
  peso_execucao: number | null; observacao: string | null;
  animal: { id: number; brinco: string | null; nome: string | null; raca: string; categoria: string; sexo: string; peso_atual: number | null; data_nascimento: string | null };
};
type MinhaOS = {
  id: number; nome: string; finalidade: string; instrucoes: string | null;
  animais_count: number; feitos_count: number;
  pastagem_destino?: { nome: string } | null;
  animais: OrdemAnimal[];
};

const FINALIDADE_ICON: Record<string, string> = {
  desmama:"🍼", vacinacao:"💉", pesagem:"⚖️", transferencia_pasto:"🌿",
  engorda:"📈", iatf:"🧬", cobertura:"🐂", diagnostico_prenhez:"🔬",
  descarte:"🗑️", venda_marketplace:"🛒", venda_direta:"🤝",
  frigorifico:"🥩", marcacao_brinco:"🏷️", outro:"📌",
};

function MinhasOrdensServico() {
  const [ordens, setOrdens]     = useState<MinhaOS[]>([]);
  const [loading, setLoading]   = useState(true);
  const [aberta, setAberta]     = useState<number | null>(null);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, { status: string; peso: string }>>({});

  useEffect(() => {
    api.get("/minhas-ordens")
      .then(r => {
        const lista: MinhaOS[] = r.data;
        setOrdens(lista);
        const map: Record<string, { status: string; peso: string }> = {};
        lista.forEach(os => os.animais?.forEach(i => {
          map[`${os.id}-${i.animal_id}`] = { status: i.status, peso: "" };
        }));
        setLocalStatus(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function salvarAnimal(osId: number, animalId: number) {
    const key = `${osId}-${animalId}`;
    const s = localStatus[key];
    if (!s) return;
    setSalvando(animalId);
    try {
      await api.put(`/minhas-ordens/${osId}/animais/${animalId}`, {
        status: s.status,
        peso_execucao: s.peso ? parseFloat(s.peso) : null,
      });
      setOrdens(prev => prev.map(os => {
        if (os.id !== osId) return os;
        return {
          ...os,
          feitos_count: os.animais.filter(a => (a.animal_id === animalId ? s.status : a.status) === "feito").length,
          animais: os.animais.map(a => a.animal_id === animalId ? { ...a, status: s.status } : a),
        };
      }));
    } catch { alert("Erro ao salvar. Verifique a conexão."); }
    finally { setSalvando(null); }
  }

  if (loading) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <p className="text-sm text-amber-600 animate-pulse">Carregando suas ordens...</p>
    </div>
  );

  if (ordens.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"/>
        Minhas Ordens de Serviço ({ordens.length})
      </h2>
      {ordens.map(os => {
        const pct = os.animais_count > 0 ? Math.round(os.feitos_count / os.animais_count * 100) : 0;
        const isAberta = aberta === os.id;
        const needsPeso = ["pesagem","frigorifico"].includes(os.finalidade);

        return (
          <div key={os.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <button onClick={() => setAberta(isAberta ? null : os.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-50 transition-colors">
              <span className="text-xl">{FINALIDADE_ICON[os.finalidade] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{os.nome}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${pct}%` }}/>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{os.feitos_count}/{os.animais_count}</span>
                </div>
              </div>
              <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isAberta ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {isAberta && (
              <div className="border-t border-amber-100">
                {os.instrucoes && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs text-amber-700">{os.instrucoes}</p>
                  </div>
                )}
                {os.pastagem_destino && (
                  <div className="px-4 py-2 bg-green-50 border-b border-green-100">
                    <p className="text-xs text-green-700 font-semibold">Destino: {os.pastagem_destino.nome}</p>
                  </div>
                )}
                <div className="divide-y divide-gray-50">
                  {os.animais.map(item => {
                    const key = `${os.id}-${item.animal_id}`;
                    const local = localStatus[key] ?? { status: item.status, peso: "" };
                    const isDone = local.status === "feito";

                    return (
                      <div key={item.id} className={`p-3 ${isDone ? "bg-green-50" : ""}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {item.animal?.brinco ?? "Sem brinco"}{item.animal?.nome ? ` — ${item.animal.nome}` : ""}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.animal?.raca} · {item.animal?.categoria} ·{" "}
                              {item.animal?.peso_atual ? `${item.animal.peso_atual}kg` : "sem peso"}
                            </p>
                          </div>
                          <select
                            value={local.status}
                            onChange={e => setLocalStatus(prev => ({ ...prev, [key]: { ...local, status: e.target.value } }))}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 ${
                              local.status === "feito" ? "bg-green-100 text-green-700" :
                              local.status === "nao_realizado" ? "bg-red-100 text-red-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                            <option value="pendente">Pendente</option>
                            <option value="feito">Feito ✓</option>
                            <option value="nao_realizado">Não realizado</option>
                          </select>
                        </div>

                        {isDone && needsPeso && (
                          <div className="mt-2 flex gap-2">
                            <input type="number" value={local.peso}
                              onChange={e => setLocalStatus(prev => ({ ...prev, [key]: { ...local, peso: e.target.value } }))}
                              placeholder="Peso (kg)" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                          </div>
                        )}

                        {local.status !== item.status && (
                          <button onClick={() => salvarAnimal(os.id, item.animal_id)}
                            disabled={salvando === item.animal_id}
                            className="mt-2 w-full bg-green-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
                            {salvando === item.animal_id ? "Salvando..." : "Confirmar"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CurralPage() {
  const [online, setOnline]           = useState(true);
  const [animais, setAnimais]         = useState<Animal[]>([]);
  const [lotes, setLotes]             = useState<Lote[]>([]);
  const [sessoes, setSessoes]         = useState<Sessao[]>([]);
  const [pesagens, setPesagens]       = useState<PesagemLocal[]>([]);
  const [eventos, setEventos]         = useState<EventoLocal[]>([]);
  const [sessaoAtual, setSessaoAtual] = useState<number | null>(null);
  const [aba, setAba]                 = useState<"pesagens"|"eventos"|"sessoes">("pesagens");
  const [buscaAnimal, setBuscaAnimal] = useState("");
  const [animalSel, setAnimalSel]     = useState<Animal | null>(null);
  const [pesoInput, setPesoInput]     = useState("");
  const [novoEvento, setNovoEvento]   = useState({ tipo: "outros", descricao: "", animal_id: "" });
  const [fotoEvento, setFotoEvento]   = useState<string | null>(null);
  const fotoInputRef                  = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState("");

  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    // Carrega dados offline (cached from localStorage)
    const cached = localStorage.getItem("curral_dados");
    if (cached) {
      const d = JSON.parse(cached);
      setAnimais(d.animais || []);
      setLotes(d.lotes || []);
    }

    const cachedSessao = localStorage.getItem("curral_sessao");
    if (cachedSessao) setSessaoAtual(parseInt(cachedSessao));

    const cachedPesagens = localStorage.getItem("curral_pesagens");
    if (cachedPesagens) setPesagens(JSON.parse(cachedPesagens));

    const cachedEventos = localStorage.getItem("curral_eventos");
    if (cachedEventos) setEventos(JSON.parse(cachedEventos));

    if (navigator.onLine) sincronizarDados();
    loadSessoes();
  }, []);

  async function sincronizarDados() {
    try {
      const r = await api.get("/gestao/curral/dados-offline");
      localStorage.setItem("curral_dados", JSON.stringify(r.data));
      setAnimais(r.data.animais || []);
      setLotes(r.data.lotes || []);
    } catch {}
  }

  async function loadSessoes() {
    if (!navigator.onLine) return;
    try {
      const r = await api.get("/gestao/curral/sessoes");
      setSessoes(r.data.data || []);
    } catch {}
  }

  async function iniciarSessao() {
    const s = await api.post("/gestao/curral/sessoes", { descricao: "Sessão de curral " + new Date().toLocaleDateString("pt-BR") });
    setSessaoAtual(s.data.id);
    localStorage.setItem("curral_sessao", String(s.data.id));
  }

  function adicionarPesagem() {
    if (!animalSel || !pesoInput) return;
    const p: PesagemLocal = {
      animal_id: animalSel.id, brinco: animalSel.brinco,
      peso_kg: pesoInput, data: new Date().toISOString().split("T")[0],
    };
    const novas = [...pesagens, p];
    setPesagens(novas);
    localStorage.setItem("curral_pesagens", JSON.stringify(novas));
    setAnimalSel(null); setPesoInput(""); setBuscaAnimal("");
  }

  const handleFotoCaptura = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setFotoEvento(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  function adicionarEvento() {
    if (!novoEvento.descricao) return;
    const ev: EventoLocal = {
      tipo: novoEvento.tipo, descricao: novoEvento.descricao,
      animal_id: novoEvento.animal_id ? parseInt(novoEvento.animal_id) : undefined,
      data_evento: new Date().toISOString().split("T")[0],
      foto_base64: fotoEvento ?? undefined,
    };
    const novos = [...eventos, ev];
    setEventos(novos);
    localStorage.setItem("curral_eventos", JSON.stringify(novos));
    setNovoEvento({ tipo: "outros", descricao: "", animal_id: "" });
    setFotoEvento(null);
  }

  async function enviarParaServidor() {
    if (!online) { setSyncMsg("Sem conexão. Tente quando tiver internet."); return; }
    setSyncing(true); setSyncMsg("");
    try {
      let sid = sessaoAtual;
      if (!sid) {
        const s = await api.post("/gestao/curral/sessoes", { descricao: "Sessão offline" });
        sid = s.data.id;
        setSessaoAtual(sid);
        localStorage.setItem("curral_sessao", String(sid));
      }
      await api.post(`/gestao/curral/sessoes/${sid}/sincronizar`, {
        pesagens: pesagens.map(p => ({ animal_id: p.animal_id, peso_kg: parseFloat(p.peso_kg), data: p.data })),
        eventos,
      });
      setPesagens([]); setEventos([]);
      localStorage.removeItem("curral_pesagens");
      localStorage.removeItem("curral_eventos");
      localStorage.removeItem("curral_sessao");
      setSessaoAtual(null);
      setSyncMsg(`✓ ${pesagens.length + eventos.length} registros enviados com sucesso!`);
      loadSessoes();
    } catch (e: any) {
      setSyncMsg("Erro ao sincronizar. Tente novamente.");
    } finally { setSyncing(false); }
  }

  const animaisFiltrados = animais.filter(a =>
    a.brinco.includes(buscaAnimal) || (a.nome ?? "").toLowerCase().includes(buscaAnimal.toLowerCase())
  ).slice(0, 6);

  const totalPendentes = pesagens.length + eventos.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Curral</h1>
          <p className="text-gray-500 text-sm">Coleta de dados no curral — funciona offline</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
            {online ? "Online" : "Offline"}
          </span>
          {online && !sessaoAtual && (
            <button onClick={iniciarSessao} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">
              Iniciar sessão
            </button>
          )}
        </div>
      </div>

      {/* Minhas OS atribuídas */}
      <MinhasOrdensServico />

      {/* Pendentes + Sincronizar */}
      {totalPendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-800">
              {totalPendentes} registro{totalPendentes !== 1 ? "s" : ""} pendente{totalPendentes !== 1 ? "s" : ""}
            </p>
            <p className="text-amber-600 text-xs">{pesagens.length} pesagem(ns) · {eventos.length} evento(s)</p>
          </div>
          <button onClick={enviarParaServidor} disabled={syncing || !online}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${online ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {syncing ? "Enviando..." : "☁️ Sincronizar"}
          </button>
        </div>
      )}
      {syncMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${syncMsg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {syncMsg}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["pesagens","eventos","sessoes"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-medium transition ${aba === a ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {a === "pesagens" ? `⚖️ Pesagens${pesagens.length > 0 ? ` (${pesagens.length})` : ""}` :
             a === "eventos"  ? `📣 Eventos${eventos.length > 0 ? ` (${eventos.length})` : ""}` : "📋 Histórico"}
          </button>
        ))}
      </div>

      {/* Pesagens */}
      {aba === "pesagens" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Registrar pesagem</h2>
            <div className="space-y-3">
              <input value={buscaAnimal} onChange={e => { setBuscaAnimal(e.target.value); setAnimalSel(null); }}
                placeholder="Buscar por brinco ou nome..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              {buscaAnimal && !animalSel && animaisFiltrados.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {animaisFiltrados.map(a => (
                    <button key={a.id} type="button" onClick={() => { setAnimalSel(a); setBuscaAnimal(`${a.brinco} – ${a.nome ?? a.raca}`); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <span className="font-semibold">{a.brinco}</span>
                      {a.nome && <span className="text-gray-500"> – {a.nome}</span>}
                      <span className="text-gray-400 text-xs ml-2">{a.raca} · {a.categoria}</span>
                      {a.peso_atual && <span className="text-gray-400 text-xs ml-2">atual: {a.peso_atual}kg</span>}
                    </button>
                  ))}
                </div>
              )}
              {animalSel && (
                <div className="flex gap-3">
                  <input type="number" value={pesoInput} onChange={e => setPesoInput(e.target.value)}
                    placeholder={`Peso em kg${animalSel.peso_atual ? ` (anterior: ${animalSel.peso_atual}kg)` : ""}`}
                    step="0.1" min="1"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <button onClick={adicionarPesagem}
                    className="bg-green-700 text-white font-bold text-sm px-5 rounded-xl hover:bg-green-800">
                    + Adicionar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista pesagens locais */}
          {pesagens.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500">{pesagens.length} pesagem(ns) aguardando sincronização</p>
              </div>
              {pesagens.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-800">{p.brinco}</p>
                    <p className="text-xs text-gray-400">{p.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-700 text-lg">{p.peso_kg} kg</span>
                    <button onClick={() => { const n = pesagens.filter((_,idx) => idx !== i); setPesagens(n); localStorage.setItem("curral_pesagens", JSON.stringify(n)); }}
                      className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Eventos offline */}
      {aba === "eventos" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Registrar evento</h2>
            <div className="space-y-3">
              <select value={novoEvento.tipo} onChange={e => setNovoEvento({...novoEvento, tipo: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea value={novoEvento.descricao} onChange={e => setNovoEvento({...novoEvento, descricao: e.target.value})}
                rows={2} placeholder="Descreva o que aconteceu..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />

              {/* Câmera */}
              <input
                ref={fotoInputRef} type="file"
                accept="image/*" capture="environment"
                className="hidden" onChange={handleFotoCaptura}
              />
              {fotoEvento ? (
                <div className="relative">
                  <img src={fotoEvento} alt="Foto" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => setFotoEvento(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow">
                    ✕
                  </button>
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">Foto adicionada</span>
                </div>
              ) : (
                <button onClick={() => fotoInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  📷 Tirar foto / anexar imagem
                </button>
              )}

              <button onClick={adicionarEvento} disabled={!novoEvento.descricao}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50">
                + Registrar evento
              </button>
            </div>
          </div>
          {eventos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500">{eventos.length} evento(s) aguardando sincronização</p>
              </div>
              {eventos.map((ev, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-500 uppercase">{ev.tipo}</span>
                      <p className="text-sm text-gray-700">{ev.descricao}</p>
                      {ev.foto_base64 && (
                        <img src={ev.foto_base64} alt="foto"
                          className="mt-2 w-24 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                          onClick={() => window.open(ev.foto_base64)}
                        />
                      )}
                    </div>
                    <button onClick={() => { const n = eventos.filter((_,idx) => idx !== i); setEventos(n); localStorage.setItem("curral_eventos", JSON.stringify(n)); }}
                      className="text-red-400 hover:text-red-600 shrink-0 mt-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {aba === "sessoes" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-5 py-3">Data</th>
              <th className="text-left px-3 py-3">Descrição</th>
              <th className="text-right px-3 py-3">Animais</th>
              <th className="text-left px-3 py-3">Status</th>
            </tr></thead>
            <tbody>
              {sessoes.length === 0
                ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhuma sessão registrada</td></tr>
                : sessoes.map(s => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{new Date(s.data_sessao).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-3 text-gray-600">{s.descricao}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">{s.total_animais}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.status === "sincronizada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
