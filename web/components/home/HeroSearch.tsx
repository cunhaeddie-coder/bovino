"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeStore } from "@/lib/themeStore";

const RACAS = ["Nelore", "Angus", "Girolando", "Brahman", "Braford", "Gir", "Simmental", "Tabapuã"];
const UFS   = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ]           = useState("");
  const [estado, setEstado] = useState("");
  const { theme } = useThemeStore();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (estado) params.set("estado", estado);
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <section className="relative bg-gradient-to-br from-green-800 via-green-700 to-green-600 text-white py-8 md:py-20 px-4 overflow-hidden">

      {/* Bandeira do Brasil decorativa — só no tema Brasil */}
      {theme === "brasil" && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <svg viewBox="0 0 720 504" className="w-full max-w-2xl opacity-10" xmlns="http://www.w3.org/2000/svg">
          {/* Verde */}
          <rect width="720" height="504" fill="#009c3b"/>
          {/* Losango amarelo */}
          <polygon points="360,40 680,252 360,464 40,252" fill="#FFDF00"/>
          {/* Círculo azul */}
          <circle cx="360" cy="252" r="130" fill="#002776"/>
          {/* Faixa branca */}
          <path d="M230,252 Q360,195 490,252" stroke="white" strokeWidth="18" fill="none"/>
          {/* Estrelas (simplificadas) */}
          {[
            [360,160],[290,210],[430,210],[260,260],[460,260],
            [300,305],[420,305],[360,340]
          ].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="7" fill="white"/>
          ))}
        </svg>
      </div>
      )}

      <div className="relative max-w-3xl mx-auto text-center space-y-5">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          O maior mercado de{" "}
          <span className="text-yellow-300">gado bovino</span>{" "}
          do Brasil
        </h1>
        <p className="text-green-100 text-sm md:text-lg">
          Compre e venda nelore, angus, girolando e muito mais — direto do produtor.
        </p>

        {/* Formulário */}
        <form onSubmit={handleSearch}
          className="bg-white rounded-2xl p-3 shadow-2xl text-gray-900 space-y-2 sm:space-y-0 sm:flex sm:gap-2">

          {/* Input de raça — ocupa largura total no mobile, flex-1 no desktop */}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Nelore, boi gordo, bezerro..."
            list="racas-list"
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
          />
          <datalist id="racas-list">
            {RACAS.map(r => <option key={r} value={r} />)}
          </datalist>

          {/* No mobile: estado + botão lado a lado; no desktop: inline */}
          <div className="flex gap-2 sm:contents">
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200 bg-white"
            >
              <option value="">Estado</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <button type="submit"
              className="flex-1 sm:flex-none bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-800 transition-colors text-sm whitespace-nowrap">
              🔍 Buscar
            </button>
          </div>
        </form>

        {/* Tags rápidas */}
        <div className="flex flex-wrap justify-center gap-2">
          {RACAS.slice(0, 6).map(r => (
            <button key={r} onClick={() => router.push(`/busca?raca=${r}`)}
              className="bg-green-600/50 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors border border-green-500">
              {r}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

