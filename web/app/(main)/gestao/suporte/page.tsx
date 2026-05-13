"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Mensagem = {
  papel: "usuario" | "ia" | "admin";
  conteudo: string;
  created_at: string;
  admin_nome?: string | null;
};

type Conversa = {
  id: number;
  status: "aberta" | "em_atendimento" | "resolvida" | "escalada";
};

const STATUS_CONFIG = {
  aberta:          { label: "Aberta",          color: "bg-blue-100 text-blue-700" },
  em_atendimento:  { label: "Em atendimento",  color: "bg-green-100 text-green-700" },
  escalada:        { label: "Aguardando equipe", color: "bg-amber-100 text-amber-700" },
  resolvida:       { label: "Resolvida",       color: "bg-slate-100 text-slate-500" },
};

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function SuportePage() {
  const [conversa, setConversa]     = useState<Conversa | null>(null);
  const [mensagens, setMensagens]   = useState<Mensagem[]>([]);
  const [texto, setTexto]           = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [polling, setPolling]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  async function carregar() {
    try {
      const { data } = await api.get("/suporte");
      setConversa(data.conversa);
      setMensagens(data.mensagens ?? []);
    } catch {} finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Polling a cada 5s quando conversa está em atendimento humano
  useEffect(() => {
    if (!conversa || conversa.status === "resolvida") return;
    const interval = setInterval(carregar, 5000);
    return () => clearInterval(interval);
  }, [conversa?.status]);

  // Scroll para o final ao receber mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;

    const msg = texto.trim();
    setTexto("");
    setEnviando(true);

    // Otimista: adiciona mensagem do usuário imediatamente
    const msgUsuario: Mensagem = { papel: "usuario", conteudo: msg, created_at: new Date().toISOString() };
    setMensagens(prev => [...prev, msgUsuario]);

    try {
      const { data } = await api.post("/suporte/enviar", {
        mensagem:    msg,
        conversa_id: conversa?.id ?? null,
      });

      if (!conversa) setConversa({ id: data.conversa_id, status: "aberta" });

      if (data.resposta) {
        setMensagens(prev => [...prev, {
          papel:      "ia",
          conteudo:   data.resposta,
          created_at: new Date().toISOString(),
        }]);
      }

      if (data.escalada) {
        setConversa(prev => prev ? { ...prev, status: "escalada" } : prev);
      }

    } catch {
      setMensagens(prev => prev.filter(m => m !== msgUsuario));
      setTexto(msg);
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }

  async function novaConversa() {
    await api.post("/suporte/nova");
    setConversa(null);
    setMensagens([]);
    setTexto("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e as any); }
  }

  if (carregando) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Suporte</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tire dúvidas sobre o Bovino com nosso assistente</p>
        </div>
        {conversa && conversa.status !== "resolvida" && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[conversa.status]?.color}`}>
              {STATUS_CONFIG[conversa.status]?.label}
            </span>
            <button onClick={novaConversa}
              className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2 py-1 transition">
              Nova conversa
            </button>
          </div>
        )}
      </div>

      {/* Área de chat */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col" style={{ minHeight: "480px" }}>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "520px" }}>

          {/* Boas-vindas */}
          {mensagens.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">🐄</div>
              <div>
                <p className="text-sm font-bold text-slate-800">Olá! Como posso ajudar?</p>
                <p className="text-xs text-slate-400 mt-1">Pergunte sobre planos, funcionalidades ou qualquer dúvida sobre o Bovino.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  "Como funciona o plano Elite?",
                  "Como cadastrar meu rebanho?",
                  "Como exportar dados para o contador?",
                ].map(s => (
                  <button key={s} onClick={() => { setTexto(s); inputRef.current?.focus(); }}
                    className="text-xs text-left px-3 py-2 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 text-slate-600 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {mensagens.map((m, i) => (
            <div key={i} className={`flex ${m.papel === "usuario" ? "justify-end" : "justify-start"}`}>
              {m.papel !== "usuario" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  {m.papel === "ia"
                    ? <span className="text-base">🤖</span>
                    : <span className="text-base">👤</span>
                  }
                </div>
              )}
              <div className={`max-w-[80%] space-y-1`}>
                {m.papel === "admin" && m.admin_nome && (
                  <p className="text-[10px] text-slate-400 ml-1">{m.admin_nome}</p>
                )}
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.papel === "usuario"
                    ? "bg-green-600 text-white rounded-br-sm"
                    : m.papel === "admin"
                    ? "bg-blue-50 text-blue-900 border border-blue-100 rounded-bl-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {m.conteudo.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < m.conteudo.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
                <p className={`text-[10px] text-slate-400 ${m.papel === "usuario" ? "text-right" : "ml-1"}`}>
                  {fmtHora(m.created_at)}
                </p>
              </div>
            </div>
          ))}

          {/* Digitando... */}
          {enviando && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2"><span className="text-base">🤖</span></div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Banner de atendimento humano */}
          {conversa?.status === "escalada" && !enviando && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-amber-700 font-semibold">👤 Nossa equipe irá responder em breve</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Você pode continuar enviando mensagens aqui.</p>
            </div>
          )}

          {conversa?.status === "resolvida" && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center space-y-2">
              <p className="text-xs text-green-700 font-semibold">✅ Conversa encerrada</p>
              <button onClick={novaConversa}
                className="text-xs text-green-600 hover:text-green-700 underline">
                Iniciar nova conversa
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {conversa?.status !== "resolvida" && (
          <div className="border-t border-slate-100 p-3">
            <form onSubmit={enviar} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida... (Enter para enviar)"
                rows={1}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                style={{ maxHeight: "120px" }}
              />
              <button type="submit" disabled={enviando || !texto.trim()}
                className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition disabled:opacity-40 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
          </div>
        )}
      </div>
    </div>
  );
}
