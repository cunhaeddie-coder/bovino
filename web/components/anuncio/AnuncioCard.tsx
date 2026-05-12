import Link from "next/link";
import Image from "next/image";
import type { Anuncio } from "@/lib/types";

const SEXO_ICON = { macho: "♂", femea: "♀", misto: "⚥" } as const;
const SEXO_LABEL = { macho: "Macho", femea: "Fêmea", misto: "Misto" } as const;

export function AnuncioCard({ anuncio }: { anuncio: Anuncio }) {
  const foto = anuncio.fotos?.[0];
  const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(anuncio.preco_unitario);
  const total = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    anuncio.preco_unitario * anuncio.animal.quantidade
  );

  return (
    <Link
      href={`/anuncios/${anuncio.id}`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* Imagem */}
      <div className="relative h-48 bg-linear-to-br from-green-50 to-green-100 shrink-0">
        {foto ? (
          <Image src={foto.url} alt={anuncio.titulo} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-green-300">
            <span className="text-6xl">🐄</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {anuncio.is_elite && (
            <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm tracking-wide">
              👑 ELITE
            </span>
          )}
          {anuncio.destaque && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              ⭐ Destaque
            </span>
          )}
          {anuncio.user?.verificado_cpf && (
            <span className="bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              ✓ Rastreável
            </span>
          )}
          {anuncio.animal.status !== "disponivel" && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {anuncio.animal.status === "vendido" ? "Vendido" : "Reservado"}
            </span>
          )}
        </div>

        {/* Quantidade */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg backdrop-blur-sm">
          {anuncio.animal.quantidade} cab.
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-green-700 transition-colors">
          {anuncio.titulo}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {anuncio.animal.raca}
          </span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {SEXO_ICON[anuncio.animal.sexo]} {SEXO_LABEL[anuncio.animal.sexo]}
          </span>
          {anuncio.animal.idade_meses && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {anuncio.animal.idade_meses}m
            </span>
          )}
          {anuncio.animal.peso_estimado && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              ~{anuncio.animal.peso_estimado}kg
            </span>
          )}
        </div>

        {/* Local */}
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {anuncio.animal.municipio} — {anuncio.animal.estado}
        </p>

        {/* Preço */}
        <div className="mt-auto pt-2 border-t border-gray-50 flex items-end justify-between">
          <div>
            <p className="text-green-700 font-bold text-lg leading-none">{preco}</p>
            <p className="text-gray-400 text-xs mt-0.5">por cabeça</p>
          </div>
          {anuncio.animal.quantidade > 1 && (
            <div className="text-right">
              <p className="text-gray-700 font-semibold text-sm">{total}</p>
              <p className="text-gray-400 text-xs">total do lote</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
