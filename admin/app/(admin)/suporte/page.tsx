"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Conversa = {
  id: number; user_nome: string; user_plano: string; fazenda_nome: string | null;
  status: string; resumo: string | null; created_at: string; updated_at: string;
  admin_nome: string | null; total_mensagens: number; ultima_mensagem_em: string | null;
};

type Mensagem = {
  id: number; papel: "usuario" | "ia" | "admin";
  conteudo: string; created_at: string; admin_nome: string | null;
};

type Paginado<T> = { data: T[]; total: number; current_page: number; last_page: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  aberta:         "bg-blue-100 text-blue-700",
  em_atendimento: "bg-green-100 text-green-700",
  escalada:       "bg-amber-100 text-amber-800 font-bold",
  resolvida:      "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta", em_atendimento: "Em atendimento", escalada: "⚠ Escalada", resolvida: "Resolvida",
};

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// ── Detalhe da conversa ───────────────────────────────────────────────────────

function DetalheConversa({ id, onUpdate }: { id: number; onUpdate: () => void }) {
  const [conversa, setConversa]   = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [resposta, setResposta]   = useState("");
  const [enviando, setEnviando]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    const { data } = await api.get(`/suporte/${id}`);
    setConversa(data.conversa);
    setMensagens(data.mensagens);
  }

  useEffect(() => { carregar(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function enviarResposta(e: React.FormEvent) {
    e.preventDefault();
    if (!resposta.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/suporte/${id}/responder`, { conteudo: resposta });
      setResposta("");
      await carregar();
      onUpdate();
    } finally { setEnviando(false); }
  }

  async function resolver() {
    if (!confirm("Marcar como resolvida?")) return;
    await api.post(`/suporte/${id}/resolver`);
    await carregar();
    onUpdate();
  }

  async function escalar() {
    await api.post(`/suporte/${id}/escalar`);
    await carregar();
    onUpdate();
  }

  if (!conversa) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{conversa.user_nome}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLOR[conversa.status]}`}>
              {STATUS_LABEL[conversa.status]}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {conversa.user_plano} · {conversa.fazenda_nome ?? "sem fazenda"} · {fmtData(conversa.created_at)}
          </p>
        </div>
        {conversa.status !== "resolvida" && (
          <div className="flex gap-2 shrink-0">
            {conversa.status !== "escalada" && (
              <button onClick={escalar}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold transition">
                ⚠ Escalar
              </button>
            )}
            <button onClick={resolver}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-semibold transition">
              ✓ Resolver
            </button>
          </div>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.map(m => (
          <div key={m.id} className={`flex ${m.papel === "usuario" ? "justify-end" : "justify-start"}`}>
            {m.papel !== "usuario" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0">
                {m.papel === "ia" ? <span>🤖</span> : <span>👤</span>}
              </div>
            )}
            <div className="max-w-[80%] space-y-1">
              {m.papel === "admin" && m.admin_nome && (
                <p className="text-[10px] text-slate-400 ml-1">{m.admin_nome}</p>
              )}
              {m.papel === "ia" && (
                <p className="text-[10px] text-slate-400 ml-1">IA Bovino</p>
              )}
              <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.papel === "usuario"
                  ? "bg-slate-100 text-slate-800 rounded-br-sm"
                  : m.papel === "admin"
                  ? "bg-blue-600 text-white rounded-bl-sm"
                  : "bg-green-50 border border-green-100 text-green-900 rounded-bl-sm"
              }`}>
                {m.conteudo.split("\n").map((l, i) => (
                  <span key={i}>{l}{i < m.conteudo.split("\n").length-1 && <br />}</span>
                ))}
              </div>
              <p className={`text-[10px] text-slate-400 ${m.papel === "usuario" ? "text-right" : "ml-1"}`}>
                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input de resposta */}
      {conversa.status !== "resolvida" && (
        <div className="border-t border-slate-100 p-3 shrink-0">
          <form onSubmit={enviarResposta} className="flex gap-2">
            <textarea
              value={resposta}
              onChange={e => setResposta(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarResposta(e as any); } }}
              placeholder="Responder como humano... (Enter para enviar)"
              rows={2}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button type="submit" disabled={enviando || !resposta.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
              {enviando ? "..." : "Enviar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SuportePage() {
  const [conversas, setConversas] = useState<Paginado<Conversa> | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [pendentes, setPendentes] = useState({ abertas: 0, escaladas: 0 });

  async function carregar() {
    const params = new URLSearchParams();
    if (filtroStatus) params.set("status", filtroStatus);
    const [conv, pend] = await Promise.all([
      api.get(`/suporte?${params}`).then(r => r.data),
      api.get("/suporte/pendentes").then(r => r.data).catch(() => ({})),
    ]);
    setConversas(conv);
    setPendentes(pend);
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  // Polling para novas mensagens
  useEffect(() => {
    const interval = setInterval(carregar, 8000);
    return () => clearInterval(interval);
  }, [filtroStatus]);

  const totalPendentes = pendentes.abertas + pendentes.escaladas;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0">

      {/* Lista de conversas */}
      <div className="w-80 shrink-0 flex flex-col border-r border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-800">
              Chat Suporte
              {totalPendentes > 0 && (
                <span className="ml-2 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">{totalPendentes}</span>
              )}
            </h2>
            <button onClick={carregar} className="text-xs text-slate-400 hover:text-slate-600">↻</button>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {([["", "Todas"], ["escalada", "⚠ Escaladas"], ["aberta", "Abertas"], ["resolvida", "Resolvidas"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFiltroStatus(k)}
                className={`flex-1 py-1 text-[10px] font-semibold rounded transition ${filtroStatus === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!conversas ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversas.data.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">Nenhuma conversa</p>
          ) : conversas.data.map(c => (
            <button key={c.id} onClick={() => setSelecionada(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${selecionada === c.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{c.user_nome}</p>
                  <p className="text-[10px] text-slate-400 truncate">{c.resumo ?? "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {c.ultima_mensagem_em ? fmtData(c.ultima_mensagem_em) : fmtData(c.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{c.user_plano} · {c.total_mensagens} msgs</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 min-w-0 bg-white">
        {selecionada ? (
          <DetalheConversa key={selecionada} id={selecionada} onUpdate={carregar} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <p className="text-3xl">💬</p>
            <p className="text-sm font-semibold text-slate-600">Selecione uma conversa</p>
            {totalPendentes > 0 && (
              <p className="text-xs text-amber-600">
                {pendentes.escaladas > 0 && `${pendentes.escaladas} escalada(s) aguardando`}
                {pendentes.abertas > 0 && ` · ${pendentes.abertas} aberta(s)`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
