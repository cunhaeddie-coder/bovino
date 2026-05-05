"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RACAS = ["Nelore", "Angus", "Girolando", "Brahman", "Braford", "Gir", "Simmental", "Tabapuã"];

export function HeroSearch() {
  const router = useRouter();
  const [raca, setRaca] = useState("");
  const [estado, setEstado] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (raca) params.set("raca", raca);
    if (estado) params.set("estado", estado);
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <section className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 text-white py-12 md:py-20 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          O maior mercado de<br />
          <span className="text-yellow-300">gado bovino</span> do Brasil
        </h1>
        <p className="text-green-100 text-base md:text-lg">
          Compre e venda nelore, angus, girolando e muito mais — direto do produtor.
        </p>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl p-3 flex flex-col sm:flex-row gap-2 shadow-2xl text-gray-900">
          <input
            value={raca}
            onChange={(e) => setRaca(e.target.value)}
            placeholder="Raça (Nelore, Angus...)"
            list="racas-list"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
          />
          <datalist id="racas-list">
            {RACAS.map((r) => <option key={r} value={r} />)}
          </datalist>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200 bg-white"
          >
            <option value="">Todos os estados</option>
            {["MT","MS","GO","MG","SP","RS","PR","BA","TO","PA","RO","RR","AM","AC","AP","MA","PI","CE","RN","PB","PE","AL","SE","ES","RJ","SC","DF"].map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <button type="submit"
            className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-800 transition-colors text-sm whitespace-nowrap">
            🔍 Buscar
          </button>
        </form>

        {/* Tags rápidas */}
        <div className="flex flex-wrap justify-center gap-2">
          {RACAS.slice(0, 6).map((r) => (
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
