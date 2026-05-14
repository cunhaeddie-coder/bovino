"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Cotacao, Mensagem, Negociacao } from "@/lib/types";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aberta:    { label: "Aberta",    color: "bg-blue-100 text-blue-700" },
  aceita:    { label: "Aceita",    color: "bg-green-100 text-green-700" },
  recusada:  { label: "Recusada",  color: "bg-red-100 text-red-600" },
  concluida: { label: "Concluída", color: "bg-gray-200 text-gray-600" },
};

const PHONE_REGEX = /(\b\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}\b|whatsapp|wpp|zap\s*zap|meu\s*(n[uú]mero|fone|celular|cel\b)|t[eé]l[eé]fone)/i;

function detectaContato(texto: string) {
  return PHONE_REGEX.test(texto);
}

const QUICK_REPLIES = [
  "Topei!",
  "Vou pensar e te retorno.",
  "Posso visitar na fazenda?",
  "Qual a forma de pagamento?",
  "Tem GTA disponível?",
];

function BubbleMensagem({ msg, isMe }: { msg: Mensagem; isMe: boolean }) {
  const isSystem = msg.corpo.startsWith("💰 Contra-proposta:");
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
          {msg.corpo}
        </span>
      </div>
    );
  }

  const hora = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isMe
            ? "bg-green-700 text-white rounded-br-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {!isMe && (
          <p className="text-[10px] font-bold mb-1 text-green-600 uppercase tracking-wide">
            {msg.remetente?.nome}
          </p>
        )}
        <p>{msg.corpo}</p>
        <p className={`text-[10px] mt-1 text-right ${isMe ? "text-green-200" : "text-gray-400"}`}>
          {hora}
          {isMe && msg.lido_em && " ✓✓"}
        </p>
      </div>
    </div>
  );
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const negId = params.id as string;

  const [neg, setNeg] = useState<Negociacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);

  // Counter-offer modal
  const [showContra, setShowContra] = useState(false);
  const [contraVal, setContraVal] = useState("");
  const [contraLoading, setContraLoading] = useState(false);

  // Visit scheduling
  const [showVisita, setShowVisita] = useState(false);
  const [visitaData, setVisitaData] = useState("");
  const [visitaHora, setVisitaHora] = useState("");
  const [visitaMensagem, setVisitaMensagem] = useState("");
  const [visitaLoading, setVisitaLoading] = useState(false);
  const [visitaEnviada, setVisitaEnviada] = useState(false);

  // Rating state
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [avaliacaoLoading, setAvaliacaoLoading] = useState(false);

  // Price calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcPeso, setCalcPeso] = useState("");
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);

  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const carregar = useCallback(
    async (initial = false) => {
      try {
        const { data } = await api.get<Negociacao>(`/negociacoes/${negId}`);
        setNeg(data);
        if (initial) {
          setLoading(false);
          // Se já existe avaliação desta negociação, marcar como enviada
          if (data.status === "concluida") {
            api.get<Negociacao[]>("/avaliacoes/pendentes")
              .then(({ data: pendentes }) => {
                const aindasemAval = pendentes.some(p => p.id === data.id);
                if (!aindasemAval) setAvaliacaoEnviada(true);
              })
              .catch(() => {});
          }
        }
      } catch {
        router.replace("/chat");
      }
    },
    [negId, router]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    carregar(true);
    const iv = setInterval(carregar, 5000);
    return () => clearInterval(iv);
  }, [user, carregar]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [neg?.mensagens?.length]);

  useEffect(() => {
    if (showCalc && !cotacao) {
      api
        .get<{ boi_gordo: Cotacao | null }>("/cotacoes/ultima")
        .then(({ data }) => setCotacao(data.boi_gordo))
        .catch(() => {});
    }
  }, [showCalc, cotacao]);

  if (!user) return null;

  const isVendedor  = neg?.vendedor?.id  === user.id;
  const isComprador = neg?.comprador?.id === user.id;
  const contato     = isVendedor ? neg?.comprador : neg?.vendedor;
  const mensagens   = neg?.mensagens ?? [];
  const statusCfg   = STATUS_CONFIG[neg?.status ?? "aberta"];

  const precoAtivo = neg?.preco_contra_proposta ?? neg?.preco_proposto;
  const totalCabecas = neg?.anuncio?.animal?.quantidade ?? 1;

  // Arroba calculator
  const arrobas =
    calcPeso && totalCabecas ? (Number(calcPeso) * totalCabecas) / 15 : null;
  const totalArroba =
    arrobas && cotacao ? arrobas * cotacao.preco_arroba : null;

  async function enviar() {
    if (!texto.trim() || sending) return;
    setSending(true);
    const corpo = texto.trim();
    setTexto("");
    try {
      await api.post(`/negociacoes/${negId}/mensagens`, { corpo });
      carregar();
    } catch {
      setTexto(corpo);
    } finally {
      setSending(false);
    }
  }

  async function atualizarStatus(status: string) {
    try {
      await api.put(`/negociacoes/${negId}/status`, { status });
      carregar();
    } catch {}
  }

  async function enviarContraProposta() {
    const preco = Number(contraVal.replace(",", "."));
    if (!preco || preco <= 0) return;
    setContraLoading(true);
    try {
      await api.post(`/negociacoes/${negId}/contra-proposta`, {
        preco_contra_proposta: preco,
        cotacao_arroba_momento: cotacao?.preco_arroba ?? null,
      });
      setShowContra(false);
      setContraVal("");
      carregar();
    } catch {
    } finally {
      setContraLoading(false);
    }
  }

  async function solicitarVisita() {
    if (!neg || !visitaData || visitaLoading) return;
    setVisitaLoading(true);
    try {
      await api.post(`/anuncios/${neg.anuncio_id}/visita`, {
        data_solicitada: visitaData,
        hora_solicitada: visitaHora || undefined,
        mensagem: visitaMensagem.trim() || undefined,
      });
      setVisitaEnviada(true);
      setShowVisita(false);
      // Manda mensagem no chat informando
      const dataFmt = new Date(visitaData + "T12:00:00").toLocaleDateString("pt-BR");
      await api.post(`/negociacoes/${neg.id}/mensagens`, {
        corpo: `📅 Solicitei uma visita para ${dataFmt}${visitaHora ? " às " + visitaHora : ""}`,
      });
      carregar();
    } catch {
    } finally {
      setVisitaLoading(false);
    }
  }

  async function enviarAvaliacao() {
    if (!neg || avaliacaoLoading) return;
    setAvaliacaoLoading(true);
    try {
      await api.post("/avaliacoes", {
        negociacao_id: neg.id,
        nota: notaAvaliacao,
        comentario: comentarioAvaliacao.trim() || undefined,
      });
      setAvaliacaoEnviada(true);
    } catch {
    } finally {
      setAvaliacaoLoading(false);
    }
  }

  function usarCalcPreco() {
    if (!totalArroba) return;
    const perCabeca = totalArroba / totalCabecas;
    setContraVal(perCabeca.toFixed(2).replace(".", ","));
    setShowCalc(false);
    setShowContra(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const isAberta = neg?.status === "aberta";
  const isEncerrada = neg?.status === "concluida" || neg?.status === "recusada";
  const cpDe = neg?.contra_proposta_de;
  // Whose turn to respond: if cp exists, it's the other party's turn
  const minhaVez =
    isAberta &&
    ((cpDe === "vendedor" && isComprador) ||
      (cpDe === "comprador" && isVendedor) ||
      (!cpDe && isVendedor));

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-96px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/chat" className="text-gray-500 hover:text-gray-800 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-base shrink-0">👤</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{contato?.nome ?? "..."}</p>
          <p className="text-xs text-gray-400 truncate">{neg?.anuncio?.titulo ?? `Negociação #${negId}`}</p>
        </div>
        {statusCfg && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Info card */}
          <div className="bg-green-50 border-b border-green-100 px-4 py-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {neg?.anuncio?.animal?.raca} · {totalCabecas} cab · {neg?.anuncio?.animal?.municipio}/{neg?.anuncio?.animal?.estado}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {neg?.anuncio?.preco_unitario && (
                    <span>Anunciado: <strong className="text-gray-700">{fmt(neg.anuncio.preco_unitario as number)}/cab</strong></span>
                  )}
                  {neg?.preco_proposto && (
                    <span>Proposta: <strong className="text-green-700">{fmt(neg.preco_proposto)}/cab</strong></span>
                  )}
                  {neg?.preco_contra_proposta && (
                    <span className="text-amber-700">
                      CP ({neg.contra_proposta_de}): <strong>{fmt(neg.preco_contra_proposta)}/cab</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowCalc((v) => !v)}
                className="text-xs text-green-700 font-semibold border border-green-300 bg-white rounded-full px-2.5 py-1 shrink-0 hover:bg-green-50"
              >
                📊 Arroba
              </button>
            </div>

            {/* Price calculator */}
            {showCalc && (
              <div className="mt-3 bg-white rounded-xl border border-green-200 p-3 text-sm space-y-2">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Calculadora por arroba</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Peso médio (kg/cab)</label>
                    <input
                      type="number"
                      value={calcPeso}
                      onChange={(e) => setCalcPeso(e.target.value)}
                      placeholder="ex: 450"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Cotação @</label>
                    <p className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 bg-gray-50 text-gray-700">
                      {cotacao ? fmt(cotacao.preco_arroba) : "Carregando..."}
                    </p>
                  </div>
                </div>
                {arrobas && (
                  <div className="bg-green-50 rounded-lg p-2.5 space-y-0.5">
                    <p className="text-xs text-gray-500">Arrobas totais: <strong>{arrobas.toFixed(1)} @</strong></p>
                    {totalArroba && (
                      <>
                        <p className="text-xs text-gray-500">Total estimado: <strong className="text-green-700 text-sm">{fmt(totalArroba)}</strong></p>
                        <p className="text-xs text-gray-500">Por cabeça: <strong>{fmt(totalArroba / totalCabecas)}</strong></p>
                      </>
                    )}
                    {totalArroba && (
                      <button
                        onClick={usarCalcPreco}
                        className="mt-1.5 w-full text-xs font-semibold bg-green-700 text-white py-1.5 rounded-lg hover:bg-green-800"
                      >
                        Usar este valor como contra-proposta
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          {neg && (() => {
            const steps = [
              { key: "proposta",    label: "Proposta" },
              { key: "negociando",  label: "Negociando" },
              { key: "aceita",      label: "Acordo" },
              { key: "concluida",   label: "Concluída" },
            ];
            const stepIdx =
              neg.status === "recusada"   ? -1 :
              neg.status === "concluida"  ?  3 :
              neg.status === "aceita"     ?  2 :
              neg.preco_contra_proposta   ?  1 : 0;
            return (
              <div className="bg-white border-b border-gray-100 px-4 py-2.5 shrink-0">
                {neg.status === "recusada" ? (
                  <p className="text-center text-xs font-semibold text-red-500">❌ Proposta recusada</p>
                ) : (
                  <div className="flex items-center gap-0">
                    {steps.map((s, i) => (
                      <div key={s.key} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                            i < stepIdx  ? "bg-green-600 border-green-600 text-white" :
                            i === stepIdx ? "bg-green-700 border-green-700 text-white ring-2 ring-green-200" :
                            "bg-white border-gray-200 text-gray-400"
                          }`}>
                            {i < stepIdx ? "✓" : i + 1}
                          </div>
                          <span className={`text-[9px] font-medium whitespace-nowrap ${i <= stepIdx ? "text-green-700" : "text-gray-400"}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 ${i < stepIdx ? "bg-green-500" : "bg-gray-200"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 bg-gray-50">
            {mensagens.length === 0 && (
              <p className="text-center text-sm text-gray-400 pt-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
            )}
            {mensagens.map((msg) => (
              <BubbleMensagem key={msg.id} msg={msg} isMe={msg.remetente?.id === user.id} />
            ))}
            <div ref={messagesEnd} />
          </div>

          {/* Action bar */}
          {minhaVez && (
            <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex gap-2 shrink-0">
              <button
                onClick={() => atualizarStatus("aceita")}
                className="flex-1 text-xs font-bold bg-green-600 text-white rounded-xl py-2 hover:bg-green-700"
              >
                ✓ Aceitar {neg?.preco_contra_proposta ? fmt(neg.preco_contra_proposta) : neg?.preco_proposto ? fmt(neg.preco_proposto) : ""}
              </button>
              <button
                onClick={() => setShowContra(true)}
                className="flex-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 rounded-xl py-2 hover:bg-amber-100"
              >
                💰 Contra
              </button>
              <button
                onClick={() => atualizarStatus("recusada")}
                className="flex-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-xl py-2 hover:bg-red-100"
              >
                ✗ Recusar
              </button>
            </div>
          )}

          {neg?.status === "aceita" && isVendedor && (
            <div className="bg-white border-t border-gray-100 px-4 py-2.5 shrink-0">
              <button
                onClick={() => atualizarStatus("concluida")}
                className="w-full text-sm font-bold bg-green-700 text-white rounded-xl py-2.5 hover:bg-green-800"
              >
                🤝 Marcar negociação como concluída
              </button>
            </div>
          )}

          {isEncerrada && (
            <div className="bg-white border-t border-gray-100 px-4 py-2.5 shrink-0">
              <p className="text-center text-sm text-gray-400">
                {neg?.status === "concluida" ? "🤝 Negociação concluída com sucesso!" : "❌ Negociação encerrada."}
              </p>
            </div>
          )}

          {/* Rating prompt — comprador, negociação concluída, ainda não avaliou */}
          {neg?.status === "concluida" && isComprador && !avaliacaoEnviada && (
            <div className="bg-amber-50 border-t border-amber-100 px-4 py-4 shrink-0">
              <p className="text-sm font-semibold text-amber-800 mb-3">Como foi a negociação?</p>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setNotaAvaliacao(i)} className="focus:outline-none">
                    <svg className={`w-8 h-8 transition-colors ${i <= notaAvaliacao ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <textarea
                value={comentarioAvaliacao}
                onChange={e => setComentarioAvaliacao(e.target.value)}
                placeholder="Conte como foi (opcional)..."
                rows={2}
                className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm resize-none mb-2 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={enviarAvaliacao}
                disabled={avaliacaoLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50"
              >
                {avaliacaoLoading ? "Enviando..." : "Publicar avaliação"}
              </button>
            </div>
          )}

          {neg?.status === "concluida" && isComprador && avaliacaoEnviada && (
            <div className="bg-green-50 border-t border-green-100 px-4 py-3 shrink-0">
              <p className="text-center text-sm text-green-700 font-semibold">⭐ Avaliação publicada. Obrigado!</p>
            </div>
          )}

          {/* Input */}
          {!isEncerrada && (
            <div className="bg-white border-t border-gray-100 px-3 pt-2 pb-3 shrink-0">
              {/* Quick replies + visita */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {isComprador && !visitaEnviada && (
                  <button
                    onClick={() => setShowVisita(true)}
                    className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 shrink-0 hover:bg-blue-100 font-semibold"
                  >
                    📅 Agendar visita
                  </button>
                )}
                {visitaEnviada && (
                  <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-3 py-1 shrink-0">
                    📅 Visita solicitada
                  </span>
                )}
              </div>
              {/* Quick replies */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_REPLIES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTexto(r)}
                    className="text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1 shrink-0 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
              {detectaContato(texto) && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-2 text-xs text-orange-800">
                  <span className="text-base shrink-0">⚠️</span>
                  <p><strong>Atenção:</strong> Manter a conversa na plataforma garante sua proteção. Pagamentos combinados fora do Bovino não têm garantia.</p>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Mensagem..."
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none max-h-28 overflow-y-auto focus:outline-none focus:border-green-400"
                  style={{ minHeight: "42px" }}
                />
                <button
                  onClick={enviar}
                  disabled={!texto.trim() || sending}
                  className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-green-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Visit scheduling modal */}
      {showVisita && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">📅 Agendar visita</h3>
              <button onClick={() => setShowVisita(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <p className="text-xs text-gray-500">Solicite uma data para visitar a propriedade. O vendedor confirma ou sugere outra data.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Data preferida</label>
                <input
                  type="date"
                  value={visitaData}
                  onChange={e => setVisitaData(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mt-1 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Horário <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
                <input
                  type="time"
                  value={visitaHora}
                  onChange={e => setVisitaHora(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mt-1 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Observação <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
                <textarea
                  value={visitaMensagem}
                  onChange={e => setVisitaMensagem(e.target.value)}
                  rows={2}
                  placeholder="Ex: Virei com veterinário para avaliação..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mt-1 text-sm resize-none focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowVisita(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={solicitarVisita} disabled={visitaLoading || !visitaData}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 hover:bg-blue-700">
                {visitaLoading ? "Enviando..." : "Solicitar visita"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter-offer modal */}
      {showContra && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Contra-proposta</h3>
              <button onClick={() => setShowContra(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {precoAtivo && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Valor atual: <strong className="text-gray-700">{fmt(precoAtivo)}/cab</strong>
                {totalCabecas > 1 && <> · Total: <strong>{fmt(precoAtivo * totalCabecas)}</strong></>}
              </p>
            )}
            <div>
              <label className="text-sm text-gray-600 font-medium">Seu preço por cabeça (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={contraVal}
                onChange={(e) => setContraVal(e.target.value)}
                placeholder="ex: 3.500,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-lg font-bold text-green-700 focus:outline-none focus:border-green-400"
                autoFocus
              />
              {contraVal && Number(contraVal.replace(",", ".")) > 0 && totalCabecas > 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  Total lote: {fmt(Number(contraVal.replace(",", ".")) * totalCabecas)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowContra(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={enviarContraProposta}
                disabled={contraLoading || !contraVal}
                className="flex-1 bg-green-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 hover:bg-green-800"
              >
                {contraLoading ? "Enviando..." : "Enviar proposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
