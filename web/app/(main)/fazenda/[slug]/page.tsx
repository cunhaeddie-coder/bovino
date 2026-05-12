import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AvaliacaoSection from "@/components/fazenda/AvaliacaoSection";

type Avaliacao = {
  id: number;
  nota: number;
  comentario: string | null;
  resposta_vendedor: string | null;
  created_at: string;
  comprador: { nome: string };
};

type Fazenda = {
  id: number;
  user_id: number;
  nome: string;
  slug: string;
  logo_url: string | null;
  fotos: string[] | null;
  descricao: string | null;
  estado: string;
  municipio: string;
  area_ha: number | null;
  anos_atividade: number | null;
  racas_principais: string[] | null;
  gta_numero: string | null;
  sisbov_numero: string | null;
  website: string | null;
  whatsapp: string | null;
  nota_media: number;
  total_vendas: number;
  avaliacoes: Avaliacao[];
};

async function getFazenda(slug: string): Promise<Fazenda | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/fazendas/${slug}`,
      { cache: "no-store" }
    );
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
      {/* Header da fazenda */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner verde */}
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
                📐 {fazenda.area_ha.toLocaleString("pt-BR")} ha
              </span>
            )}
          </div>

          {fazenda.descricao && (
            <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">{fazenda.descricao}</p>
          )}

          {/* Raças */}
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

          {/* Contato */}
          {fazenda.whatsapp && (
            <div className="mt-5">
              <a
                href={`https://wa.me/${fazenda.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition"
              >
                💬 Falar no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

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
