"use client";

import { useEffect, useState } from "react";

type Cotacao = {
  tipo: string;
  preco_arroba: number;
  estado: string | null;
};

type TickerItem = {
  label: string;
  valor: string;
  variacao?: string;
  positivo?: boolean;
  icone: string;
};

const LABEL: Record<string, string> = {
  boi_gordo: "Boi Gordo",
  bezerro:   "Bezerro",
  vaca:      "Vaca",
};

async function fetchCotacoes(): Promise<Cotacao[]> {
  try {
    const res = await fetch("/api/cotacoes/ultima", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Object.values(data).filter(Boolean) as Cotacao[];
  } catch {
    return [];
  }
}

async function fetchDolar(): Promise<{ bid: string; pctChange: string } | null> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data["USDBRL"] ?? null;
  } catch {
    return null;
  }
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CotacaoStrip() {
  const [items, setItems] = useState<TickerItem[]>([]);

  async function carregar() {
    const [cotacoes, dolar] = await Promise.all([fetchCotacoes(), fetchDolar()]);

    const novosItems: TickerItem[] = [];

    // Cotações da arroba
    for (const c of cotacoes) {
      novosItems.push({
        icone: c.tipo === "boi_gordo" ? "🐂" : c.tipo === "bezerro" ? "🐄" : "🐮",
        label: LABEL[c.tipo] ?? c.tipo,
        valor: `${BRL(c.preco_arroba)}/@`,
      });
    }

    // Dólar
    if (dolar) {
      const pct   = parseFloat(dolar.pctChange);
      const positivo = pct >= 0;
      novosItems.push({
        icone: "💵",
        label: "Dólar",
        valor: parseFloat(dolar.bid).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        variacao: `${positivo ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`,
        positivo,
      });
    }

    // Itens fixos de referência
    novosItems.push(
      { icone: "📍", label: "Referência", valor: "CEPEA/ESALQ", },
      { icone: "🗓️", label: "Atualizado", valor: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
    );

    setItems(novosItems);
  }

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 5 * 60 * 1000); // atualiza a cada 5 min
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return (
    <div className="bg-gray-950 h-8 border-b border-gray-800" />
  );

  // Duplica para loop contínuo
  const ticker = [...items, ...items, ...items];

  return (
    <div className="bg-gray-950 border-b border-gray-800 overflow-hidden relative h-9 flex items-center">
      {/* Gradientes nas bordas */}
      <div className="absolute left-0 top-0 h-full w-16 bg-linear-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-16 bg-linear-to-l from-gray-950 to-transparent z-10 pointer-events-none" />

      {/* Label fixo */}
      <div className="absolute left-0 top-0 h-full flex items-center z-20 bg-green-700 px-3 shrink-0">
        <span className="text-white text-[10px] font-extrabold tracking-widest uppercase whitespace-nowrap">
          📈 Ao vivo
        </span>
      </div>

      {/* Ticker rolando */}
      <div
        className="flex items-center gap-0 pl-24 whitespace-nowrap"
        style={{ animation: `ticker ${items.length * 6}s linear infinite` }}
      >
        {ticker.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-5 text-xs border-r border-gray-800 last:border-0">
            <span className="text-sm">{item.icone}</span>
            <span className="text-gray-400">{item.label}</span>
            <span className="text-yellow-400 font-bold">{item.valor}</span>
            {item.variacao && (
              <span className={`text-[10px] font-bold ${item.positivo ? "text-red-400" : "text-green-400"}`}>
                {item.variacao}
              </span>
            )}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
