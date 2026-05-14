"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Mensagem = { role: "user" | "assistant"; content: string; tipo?: "texto" | "audio" };

const SUGESTOES = [
  "Quantos animais tenho no rebanho?",
  "Quais alertas de saúde estão pendentes?",
  "Qual o valor estimado do meu rebanho?",
  "Qual a melhor época para vacinação contra aftosa?",
  "Como calcular o GMD do meu rebanho?",
  "Quais eventos de campo não foram resolvidos?",
  "Me dê um resumo da fazenda",
  "Boas práticas para rotação de pastagem",
];

export default function GestorIAPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Assistente Pecuário da Bovino. Posso ajudar com dúvidas sobre manejo, nutrição, saúde do rebanho e gestão da sua fazenda. Como posso ajudar hoje?",
    },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [gravando, setGravando]   = useState(false);
  const [semIA, setSemIA]         = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const mediaRef                  = useRef<MediaRecorder | null>(null);
  const chunksRef                 = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(texto: string, tipo: "texto" | "audio" = "texto") {
    if (!texto.trim() || loading) return;

    const novaMsgs: Mensagem[] = [...mensagens, { role: "user", content: texto, tipo }];
    setMensagens(novaMsgs);
    setInput("");
    setLoading(true);

    const historico = novaMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const r = await api.post("/gestao/ia/chat", {
        mensagem: texto,
        tipo,
        historico: historico.slice(0, -1),
      });
      setMensagens(prev => [...prev, { role: "assistant", content: r.data.resposta }]);
      setSemIA(false);
    } catch (err: any) {
      if (err.response?.status === 503) {
        setSemIA(true);
        setMensagens(prev => [...prev, {
          role: "assistant",
          content: "A IA não está configurada neste ambiente. Configure `ANTHROPIC_API_KEY` no arquivo `.env` da API.",
        }]);
      } else {
        setMensagens(prev => [...prev, { role: "assistant", content: "Não consegui processar sua mensagem. Tente novamente." }]);
      }
    } finally { setLoading(false); }
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        // Transcreve usando Web Speech API ou envia como texto placeholder
        const texto = await transcribeAudio(blob);
        if (texto) enviar(texto, "audio");
      };
      mr.start();
      mediaRef.current = mr;
      setGravando(true);
    } catch { alert("Microfone não disponível"); }
  }

  function pararGravacao() {
    mediaRef.current?.stop();
    setGravando(false);
  }

  async function transcribeAudio(blob: Blob): Promise<string> {
    // Usa Web Speech API via SpeechRecognition se disponível
    return new Promise(resolve => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) { resolve(""); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.onresult = (e: any) => resolve(e.results[0][0].transcript);
      recognition.onerror  = () => resolve("");
      recognition.start();
    });
  }

  function handleVoz() {
    if (gravando) { pararGravacao(); return; }

    // Usa SpeechRecognition diretamente
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Reconhecimento de voz não disponível neste navegador."); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setGravando(true);
    recognition.onend   = () => setGravando(false);
    recognition.onresult = (e: any) => {
      const texto = e.results[0][0].transcript;
      setInput(texto);
      enviar(texto, "audio");
    };
    recognition.onerror = () => setGravando(false);
    recognition.start();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 IA Gestor</h1>
          <p className="text-gray-500 text-sm">Assistente pecuário inteligente — texto e voz</p>
        </div>
        {semIA && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
            ⚠️ Configure <code className="font-mono">ANTHROPIC_API_KEY</code> para ativar a IA
          </div>
        )}
      </div>

      {/* Sugestões rápidas */}
      {mensagens.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Sugestões</p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map(s => (
              <button key={s} onClick={() => enviar(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-lg mr-2 shrink-0 self-end">🤖</div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-green-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-800 rounded-bl-sm"
            }`}>
              {m.tipo === "audio" && m.role === "user" && (
                <span className="text-xs opacity-70 block mb-1">🎤 Voz</span>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-lg ml-2 shrink-0 self-end">👤</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-lg mr-2 shrink-0">🤖</div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <button onClick={handleVoz}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition shrink-0 ${
            gravando
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700"
          }`}
          title={gravando ? "Parar gravação" : "Gravar mensagem de voz"}>
          {gravando ? "⏹" : "🎤"}
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
          placeholder="Digite sua mensagem ou use o microfone..."
          className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          onClick={() => enviar(input)}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition disabled:opacity-40 shrink-0">
          ➤
        </button>
      </div>

      {/* Links rápidos para relatórios */}
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {[
          { label: "Valor do Rebanho", action: () => enviar("Qual o valor estimado do meu rebanho agora?") },
          { label: "Alertas de Saúde", action: () => enviar("Quais animais precisam de atenção de saúde?") },
          { label: "Eventos pendentes", action: () => enviar("Tenho eventos de campo não resolvidos?") },
          { label: "Gestão financeira", action: () => enviar("Me dê um resumo financeiro da fazenda") },
        ].map(({ label, action }) => (
          <button key={label} onClick={action}
            className="text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 whitespace-nowrap transition">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
