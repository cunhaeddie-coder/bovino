import type { Metadata } from "next";
import Link from "next/link";
import { serverFetch } from "@/lib/api-server";

export const metadata: Metadata = { title: "Ranking de Vendedores — Bovino" };

type VendedorRanking = {
  id: number;
  nome: string;
  estado: string;
  municipio: string;
  nota_media: number;
  total_avaliacoes: number;
  total_vendas: number;
  fazendas: { slug: string; nome: string; racas_principais: string[] | null; logo_url: string | null }[];
  kyc: { kyc_status: string; status_ibama: string; status_ie: string } | null;
};

async function getRanking(): Promise<VendedorRanking[]> {
  try {
    return await serverFetch<VendedorRanking[]>("/ranking/vendedores", { revalidate: 300 });
  } catch {
    return [];
  }
}

const MEDALHAS = ["🥇", "🥈", "🥉"];

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(nota) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default async function RankingPage() {
  const vendedores = await getRanking();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="font-bold">🐄 Bovino</Link>
          <span className="text-green-300">/</span>
          <span className="text-sm text-green-200">Ranking de vendedores</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🏆 Top Vendedores</h1>
          <p className="text-sm text-gray-500 mt-1">Classificados por avaliação e negócios concluídos na plataforma</p>
        </div>

        {vendedores.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🏆</p>
            <p>Nenhum vendedor com avaliações ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendedores.map((v, idx) => {
              const fazenda = v.fazendas?.[0];
              const esg = v.kyc?.kyc_status === "aprovado" && v.kyc.status_ibama === "ok" && v.kyc.status_ie === "ok";
              const verificado = v.kyc?.kyc_status === "aprovado";

              return (
                <div key={v.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${idx === 0 ? "border-yellow-300 ring-1 ring-yellow-200" : "border-gray-100"}`}>
                  {/* Posição */}
                  <div className="w-10 text-center shrink-0">
                    {idx < 3 ? (
                      <span className="text-2xl">{MEDALHAS[idx]}</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {fazenda?.logo_url
                      ? <img src={fazenda.logo_url} alt={fazenda.nome} className="w-full h-full object-cover" />
                      : "👤"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{fazenda?.nome ?? v.nome}</p>
                      {verificado && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓</span>}
                      {esg && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">🌿 ESG</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{v.municipio}/{v.estado}</p>
                    {fazenda?.racas_principais && fazenda.racas_principais.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{fazenda.racas_principais.slice(0, 3).join(" · ")}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Estrelas nota={v.nota_media} />
                      <span className="text-xs font-bold text-gray-700">{v.nota_media.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({v.total_avaliacoes} aval.)</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-medium">{v.total_vendas} venda{v.total_vendas !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  {fazenda?.slug && (
                    <Link
                      href={`/fazenda/${fazenda.slug}`}
                      className="shrink-0 text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-2 hover:bg-green-50"
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Ranking atualizado a cada 5 minutos · Baseado em negócios confirmados na plataforma
        </p>
      </main>
    </div>
  );
}
