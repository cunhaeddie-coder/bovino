import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import AvaliacaoSection from "@/components/fazenda/AvaliacaoSection";
import ContatoFazenda from "@/components/fazenda/ContatoFazenda";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type Avaliacao = {
  id: number;
  nota: number;
  comentario: string | null;
  resposta_vendedor: string | null;
  created_at: string;
  comprador_nome: string;
  comprador_verificado: boolean;
};

type AnuncioFazenda = {
  id: number;
  titulo: string;
  preco_unitario: number;
  aceita_negociacao: boolean;
  views: number;
  animal: { raca: string; sexo: string; idade_meses: number | null; quantidade: number; status: string } | null;
  fotos: { url: string }[];
};

type Fazenda = {
  id: number;
  user_id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  estado: string;
  municipio: string;
  area_ha: number | null;
  anos_atividade: number | null;
  racas_principais: string[] | null;
  gta_numero: string | null;
  sisbov_numero: string | null;
  website: string | null;
  logo_url: string | null;
  nota_media: number;
  total_vendas: number;
  avaliacoes: Avaliacao[];
  anuncios: AnuncioFazenda[];
};

async function getFazenda(slug: string): Promise<Fazenda | null> {
  try {
    const res = await fetch(`${API}/fazendas/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fazenda = await getFazenda(slug);
  if (!fazenda) return { title: "Fazenda não encontrada" };
  return { title: `${fazenda.nome} — Bovino` };
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(nota) ? "text-yellow-400" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

export default async function FazendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fazenda = await getFazenda(slug);
  if (!fazenda) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-green-800 to-green-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-green-100 flex items-center justify-center text-4xl overflow-hidden">
              {fazenda.logo_url
                ? <img src={fazenda.logo_url} alt={fazenda.nome} className="w-full h-full object-cover" />
                : "🐄"}
            </div>
            <div className="mb-1">
              <h1 className="text-2xl font-extrabold text-gray-900">{fazenda.nome}</h1>
              <p className="text-gray-500 text-sm">{fazenda.municipio} — {fazenda.estado}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {fazenda.gta_numero && (
              <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                ✅ GTA {fazenda.gta_numero}
              </span>
            )}
            {fazenda.sisbov_numero && (
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                🏷️ SISBOV {fazenda.sisbov_numero}
              </span>
            )}
            {fazenda.anos_atividade && (
              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                🌾 {fazenda.anos_atividade} anos de atividade
              </span>
            )}
            {fazenda.area_ha && (
              <span className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                📐 {Number(fazenda.area_ha).toLocaleString("pt-BR")} ha
              </span>
            )}
          </div>

          {fazenda.descricao && (
            <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">{fazenda.descricao}</p>
          )}

          {fazenda.racas_principais && fazenda.racas_principais.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Raças principais</p>
              <div className="flex flex-wrap gap-1.5">
                {fazenda.racas_principais.map(r => (
                  <span key={r} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <ContatoFazenda slug={fazenda.slug} />
          </div>
        </div>
      </div>

      {/* Anúncios ativos */}
      {fazenda.anuncios.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Anúncios disponíveis
            <span className="ml-2 text-sm font-normal text-gray-400">({fazenda.anuncios.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fazenda.anuncios.map(a => (
              <Link
                key={a.id}
                href={`/anuncios/${a.id}`}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {a.fotos?.[0]
                    ? <img src={a.fotos[0].url} alt={a.titulo} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl">🐄</div>}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{a.titulo}</p>
                  {a.animal && (
                    <p className="text-xs text-gray-500 mb-2">
                      {a.animal.raca} · {a.animal.quantidade} cab.
                      {a.animal.idade_meses ? ` · ${a.animal.idade_meses} meses` : ""}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-green-700 font-bold text-sm">
                      R$ {a.preco_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-gray-400">/cab.</span>
                    </p>
                    {a.aceita_negociacao && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Aceita proposta</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reputação */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-center">
            <p className="text-5xl font-extrabold text-gray-900">{fazenda.nota_media.toFixed(1)}</p>
            <Estrelas nota={fazenda.nota_media} />
            <p className="text-xs text-gray-400 mt-1">{fazenda.total_vendas} venda(s) confirmada(s)</p>
          </div>
          <div className="w-px h-16 bg-gray-100" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Avaliações de compradores</h2>
            <p className="text-gray-500 text-sm">Vendas verificadas na plataforma</p>
          </div>
        </div>

        <AvaliacaoSection
          vendedorUserId={fazenda.user_id}
          avaliacoesIniciais={fazenda.avaliacoes}
        />
      </div>
    </div>
  );
}
