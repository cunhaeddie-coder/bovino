"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Animal = { id: number; brinco: string; nome: string | null; raca: string; categoria: string; sexo: string; peso_atual: number | null };
type Lote   = { id: number; nome: string; raca: string; qtd_cabecas: number };
type PesagemLocal   = { animal_id: number; brinco: string; peso_kg: string; data: string };
type EventoLocal    = { tipo: string; descricao: string; animal_id?: number; data_evento: string };
type Sessao = { id: number; data_sessao: string; descricao: string; status: string; total_animais: number; sincronizado_em: string | null };

const TIPOS_EVENTO = ["nascimento","morte","acidente","doença","fuga","cobertura","parto","cio","outros"];

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

  function adicionarEvento() {
    if (!novoEvento.descricao) return;
    const ev: EventoLocal = {
      tipo: novoEvento.tipo, descricao: novoEvento.descricao,
      animal_id: novoEvento.animal_id ? parseInt(novoEvento.animal_id) : undefined,
      data_evento: new Date().toISOString().split("T")[0],
    };
    const novos = [...eventos, ev];
    setEventos(novos);
    localStorage.setItem("curral_eventos", JSON.stringify(novos));
    setNovoEvento({ tipo: "outros", descricao: "", animal_id: "" });
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
                <div key={i} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">{ev.tipo}</span>
                    <p className="text-sm text-gray-700">{ev.descricao}</p>
                  </div>
                  <button onClick={() => { const n = eventos.filter((_,idx) => idx !== i); setEventos(n); localStorage.setItem("curral_eventos", JSON.stringify(n)); }}
                    className="text-red-400 hover:text-red-600">✕</button>
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
