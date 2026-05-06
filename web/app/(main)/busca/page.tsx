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
  if (sp.raca) params.raca = sp.raca as string;
  if (sp.estado) params.estado = sp.estado as string;
  if (sp.municipio) params.municipio = sp.municipio as string;
  if (sp.sexo) params.sexo = sp.sexo as string;

  const { data: anuncios, total } = await buscar(params);

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
        <form method="GET" className="bg-white rounded-2xl p-4 shadow-sm mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            name="raca"
            defaultValue={sp.raca as string}
            className="col-span-2 sm:col-span-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
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
            className="col-span-2 sm:col-span-1 bg-green-700 text-white rounded-lg py-2 font-semibold hover:bg-green-800 text-sm"
          >
            Buscar
          </button>
        </form>

        <p className="text-sm text-gray-500 mb-4">{total} resultado{total !== 1 ? "s" : ""}</p>

        {anuncios.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Nenhum anúncio encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {anuncios.map((a) => <AnuncioCard key={a.id} anuncio={a} />)}
          </div>
        )}
      </main>
    </div>
  );
}
