"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Notificacao = {
  id: number;
  tipo: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
};

const TIPO_ICON: Record<string, string> = {
  nova_negociacao:      "🤝",
  mensagem_negociacao:  "💬",
  suporte_resposta:     "🛟",
  alerta_saude:         "💉",
  pagamento:            "✅",
};

function fmtTempo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [count, setCount]             = useState(0);
  const [open, setOpen]               = useState(false);
  const [items, setItems]             = useState<Notificacao[]>([]);
  const [loading, setLoading]         = useState(false);
  const ref                           = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s
  useEffect(() => {
    let active = true;
    async function fetchCount() {
      try {
        const { data } = await api.get("/notificacoes/count");
        if (active) setCount(data.nao_lidas ?? 0);
      } catch {}
    }
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function abrirDropdown() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get("/notificacoes");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function marcarLida(id: number) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n));
    setCount((c) => Math.max(0, c - 1));
    try { await api.put(`/notificacoes/${id}/ler`); } catch {}
  }

  async function marcarTodas() {
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    setCount(0);
    try { await api.post("/notificacoes/marcar-todas-lidas"); } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={abrirDropdown}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-green-600 transition-colors text-white"
        aria-label="Notificações"
      >
        <span className="text-xl leading-none">🔔</span>
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm">Notificações</span>
              {items.some((n) => !n.lida) && (
                <button
                  onClick={marcarTodas}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Carregando...</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma notificação</div>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div
                      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.lida ? "bg-green-50" : ""}`}
                      onClick={() => { if (!n.lida) marcarLida(n.id); if (!n.link) setOpen(false); }}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{TIPO_ICON[n.tipo] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.lida ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {n.titulo}
                        </p>
                        {n.corpo && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.corpo}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{fmtTempo(n.created_at)}</p>
                      </div>
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-2" />
                      )}
                    </div>
                  );

                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => { marcarLida(n.id); setOpen(false); }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
