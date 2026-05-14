import type { Metadata } from "next";
import Link from "next/link";
import { serverFetch } from "@/lib/api-server";
import { AnuncioCard } from "@/components/anuncio/AnuncioCard";
import { BuscaEstadoCidade } from "@/components/ui/BuscaEstadoCidade";
import { RACAS_GRUPOS } from "@/lib/racas";
import type { Anuncio, PaginatedResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Buscar Gado" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function buscar(params: Record<string, string>): Promise<PaginatedResponse<Anuncio>> {
  try {
    const query = new URLSearchParams(params).toString();
    return await serverFetch<PaginatedResponse<Anuncio>>(`/anuncios?${query}`, { revalidate: 0 });
  } catch {
    return { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 };
  }
}

export default async function BuscaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  if (sp.q) params.q = sp.q as string;
  if (sp.raca) params.raca = sp.raca as string;
  if (sp.estado) params.estado = sp.estado as string;
  if (sp.municipio) params.municipio = sp.municipio as string;
  if (sp.sexo) params.sexo = sp.sexo as string;
  if (sp.preco_min) params.preco_min = sp.preco_min as string;
  if (sp.preco_max) params.preco_max = sp.preco_max as string;

  if (sp.page) params.page = sp.page as string;
  const { data: anuncios, total, current_page, last_page } = await buscar(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="font-bold">🐄 Bovino</Link>
          <span className="text-green-300">/</span>
          <span className="text-sm text-green-200">Buscar</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <form method="GET" className="bg-white rounded-2xl p-4 shadow-sm mb-6 space-y-3">
          {/* Busca textual */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={sp.q as string}
              placeholder="Pesquisar por raça, título ou descrição..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Filtros secundários */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              name="raca"
              defaultValue={sp.raca as string}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Todas as raças</option>
              {RACAS_GRUPOS.map((g) => (
                <optgroup key={g.aptidao} label={`── ${g.aptidao} ──`}>
                  {g.racas.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <BuscaEstadoCidade
              defaultEstado={sp.estado as string}
              defaultMunicipio={sp.municipio as string}
            />
            <select
              name="sexo"
              defaultValue={sp.sexo as string}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Sexo</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
              <option value="misto">Misto</option>
            </select>
            <button
              type="submit"
              className="bg-green-700 text-white rounded-lg py-2 font-semibold hover:bg-green-800 text-sm"
            >
              Buscar
            </button>
          </div>

          {/* Faixa de preço */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">R$/cab:</span>
            <input
              type="number"
              name="preco_min"
              defaultValue={sp.preco_min as string}
              placeholder="Mínimo"
              min="0"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              name="preco_max"
              defaultValue={sp.preco_max as string}
              placeholder="Máximo"
              min="0"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Chips dos filtros ativos */}
          {(sp.q || sp.raca || sp.estado || sp.preco_min || sp.preco_max) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sp.q && <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">🔍 "{sp.q}"</span>}
              {sp.raca && <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">🐄 {sp.raca}</span>}
              {sp.estado && <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">📍 {sp.estado}{sp.municipio ? ` / ${sp.municipio}` : ""}</span>}
              {(sp.preco_min || sp.preco_max) && (
                <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                  💰 {sp.preco_min ? `de R$${Number(sp.preco_min).toLocaleString("pt-BR")}` : ""}{sp.preco_min && sp.preco_max ? " " : ""}{sp.preco_max ? `até R$${Number(sp.preco_max).toLocaleString("pt-BR")}` : ""}
                </span>
              )}
              <a href="/busca" className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5">✕ Limpar filtros</a>
            </div>
          )}
        </form>

        <p className="text-sm text-gray-500 mb-4">{total} resultado{total !== 1 ? "s" : ""}</p>

        {anuncios.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Nenhum anúncio encontrado com esses filtros.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {anuncios.map((a) => <AnuncioCard key={a.id} anuncio={a} />)}
            </div>

            {last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {current_page > 1 && (
                  <Link
                    href={`/busca?${new URLSearchParams({ ...params, page: String(current_page - 1) })}`}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="text-sm text-gray-500">
                  Página {current_page} de {last_page}
                </span>
                {current_page < last_page && (
                  <Link
                    href={`/busca?${new URLSearchParams({ ...params, page: String(current_page + 1) })}`}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
                  >
                    Próxima →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
