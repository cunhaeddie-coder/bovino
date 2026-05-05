import type { Metadata } from "next";
import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { StatsBar } from "@/components/home/StatsBar";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { AnuncioCard } from "@/components/anuncio/AnuncioCard";
import { api } from "@/lib/api";
import type { Anuncio, PaginatedResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Bovino — Compra e venda de gado bovino no Brasil",
};

async function getAnuncios(): Promise<Anuncio[]> {
  try {
    const { data } = await api.get<PaginatedResponse<Anuncio>>("/anuncios");
    return data.data;
  } catch {
    return [];
  }
}

export default async function Home() {
  const anuncios = await getAnuncios();
  const destaques = anuncios.filter((a) => a.destaque);
  const recentes = anuncios.filter((a) => !a.destaque).slice(0, 9);

  return (
    <>
      <HeroSearch />
      <StatsBar />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* Destaques */}
        {destaques.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">⭐ Anúncios em destaque</h2>
                <p className="text-sm text-gray-500 mt-0.5">Produtores que investiram em visibilidade</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {destaques.slice(0, 3).map((a) => <AnuncioCard key={a.id} anuncio={a} />)}
            </div>
          </section>
        )}

        {/* Recentes */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🕐 Anúncios recentes</h2>
              <p className="text-sm text-gray-500 mt-0.5">Publicados nas últimas horas</p>
            </div>
            <Link href="/busca" className="text-green-700 text-sm font-medium hover:underline hidden sm:block">
              Ver todos →
            </Link>
          </div>

          {recentes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentes.map((a) => <AnuncioCard key={a.id} anuncio={a} />)}
            </div>
          )}

          {recentes.length > 0 && (
            <div className="text-center mt-8">
              <Link href="/busca"
                className="inline-flex items-center gap-2 border border-green-700 text-green-700 font-semibold px-6 py-2.5 rounded-full hover:bg-green-50 transition-colors">
                Ver todos os anúncios →
              </Link>
            </div>
          )}
        </section>

        {/* CTA para vendedor */}
        <section className="bg-linear-to-br from-green-700 to-green-800 rounded-3xl p-8 md:p-12 text-white text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Tem gado para vender?</h2>
          <p className="text-green-100 max-w-md mx-auto">
            Anuncie grátis e alcance compradores em todo o Brasil. Sem intermediários, negociação direta.
          </p>
          <Link
            href="/cadastro"
            className="inline-block bg-yellow-400 text-yellow-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition-colors text-sm md:text-base"
          >
            Criar conta e anunciar grátis
          </Link>
        </section>

        <ComoFunciona />
      </div>

      <footer className="bg-gray-900 text-gray-400 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <p className="text-white font-bold text-lg mb-2">🐄 Bovino</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              O mercado de gado bovino mais completo do Brasil.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Navegação</p>
            <ul className="space-y-2">
              {[["Buscar gado", "/busca"], ["Cotações", "/cotacoes"], ["Anunciar", "/anuncios/novo"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Conta</p>
            <ul className="space-y-2">
              {[["Entrar", "/login"], ["Cadastrar", "/cadastro"], ["Meu perfil", "/perfil"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Raças populares</p>
            <ul className="space-y-2">
              {["Nelore", "Angus", "Girolando", "Brahman"].map((r) => (
                <li key={r}><Link href={`/busca?raca=${r}`} className="hover:text-white transition-colors">{r}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Bovino. Todos os direitos reservados.</p>
            <p>Menos estrada, mais negócio.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
      <p className="text-6xl mb-4">🐄</p>
      <h3 className="text-lg font-semibold text-gray-700">Nenhum anúncio ainda</h3>
      <p className="text-gray-400 text-sm mt-1 mb-6">Seja o primeiro a anunciar seu gado</p>
      <Link
        href="/cadastro"
        className="inline-block bg-green-700 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-green-800 transition-colors text-sm"
      >
        Anunciar grátis
      </Link>
    </div>
  );
}
