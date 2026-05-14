import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api-server";
import { AnuncioGallery } from "@/components/anuncio/AnuncioGallery";
import { AnuncioOwnerActions } from "@/components/anuncio/AnuncioOwnerActions";
import type { Anuncio } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function getAnuncio(id: string): Promise<Anuncio | null> {
  try {
    return await serverFetch<Anuncio>(`/anuncios/${id}`, { revalidate: 60 });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const anuncio = await getAnuncio(id);
  if (!anuncio) return { title: "Anúncio não encontrado" };
  return {
    title: anuncio.titulo,
    description: anuncio.descricao ?? `${anuncio.animal.raca} à venda em ${anuncio.animal.municipio}/${anuncio.animal.estado}`,
  };
}

const SEXO = { macho: "Macho", femea: "Fêmea", misto: "Misto" } as const;
const STATUS = { disponivel: "Disponível", vendido: "Vendido", reservado: "Reservado" } as const;

export default async function AnuncioPage({ params }: Props) {
  const { id } = await params;
  const anuncio = await getAnuncio(id);

  if (!anuncio) notFound();

  const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(anuncio.preco_unitario);
  const midias = anuncio.midias ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="font-bold">🐄 Bovino</Link>
          <span className="text-green-300">/</span>
          <span className="text-sm text-green-200 line-clamp-1">{anuncio.titulo}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {midias.length > 0 && <AnuncioGallery midias={midias} />}

        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{anuncio.titulo}</h1>
              <p className="text-gray-500 text-sm mt-1">{anuncio.animal.municipio}/{anuncio.animal.estado}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${anuncio.animal.status === "disponivel" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {STATUS[anuncio.animal.status]}
            </span>
          </div>

          <p className="text-3xl font-bold text-green-700">{preco}<span className="text-base text-gray-400 font-normal"> /cabeça</span></p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              ["Raça", anuncio.animal.raca],
              ["Sexo", SEXO[anuncio.animal.sexo]],
              ["Quantidade", `${anuncio.animal.quantidade} cabeça${anuncio.animal.quantidade > 1 ? "s" : ""}`],
              anuncio.animal.peso_estimado ? ["Peso estimado", `${anuncio.animal.peso_estimado} kg`] : null,
              anuncio.animal.idade_meses ? ["Idade", `${anuncio.animal.idade_meses} meses`] : null,
            ].filter(Boolean).map((item) => {
              const [label, value] = item as [string, string];
              return (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
              );
            })}
          </div>

          {anuncio.descricao && (
            <div>
              <h2 className="font-semibold text-gray-700 mb-1">Descrição</h2>
              <p className="text-gray-600 text-sm whitespace-pre-line">{anuncio.descricao}</p>
            </div>
          )}

          {anuncio.animal.status === "disponivel" && (
            <Link
              href={`/chat?anuncio=${anuncio.id}`}
              className="block w-full text-center bg-green-700 text-white rounded-xl py-3 font-semibold hover:bg-green-800 transition-colors"
            >
              {anuncio.aceita_negociacao ? "Negociar / Contato" : "Entrar em contato"}
            </Link>
          )}

          <AnuncioOwnerActions anuncioId={anuncio.id} ownerId={anuncio.user_id} />
        </div>

        {anuncio.user && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Vendedor</h2>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl shrink-0">👤</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{anuncio.user.nome}</p>
                  {anuncio.user.kyc?.kyc_status === "aprovado" && (
                    <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">✓ Verificado</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{anuncio.user.municipio}/{anuncio.user.estado}</p>
                {anuncio.user.nota_media != null && anuncio.user.nota_media > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="flex">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(anuncio.user!.nota_media!) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </span>
                    <span className="text-xs text-gray-600 font-semibold">{anuncio.user.nota_media.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({anuncio.user.total_avaliacoes} avaliação{anuncio.user.total_avaliacoes !== 1 ? "ões" : ""})</span>
                  </div>
                )}

                {/* Badges KYC completos */}
                {anuncio.user.kyc?.kyc_status === "aprovado" && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {anuncio.user.kyc.status_receita === "ok" && (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">✓ CPF/CNPJ verificado</span>
                    )}
                    {anuncio.user.kyc.status_ie === "ok" && (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">✓ IE ativa (GTA)</span>
                    )}
                    {anuncio.user.kyc.status_ibama === "ok" && (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">✓ Sem embargo IBAMA</span>
                    )}
                    {anuncio.user.kyc.status_ie === "ok" && anuncio.user.kyc.status_ibama === "ok" && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">🌿 Conformidade ESG</span>
                    )}
                  </div>
                )}

                {/* Fallback badges antigos */}
                {!anuncio.user.kyc && (
                  <div className="flex gap-2 mt-1">
                    {anuncio.user.verificado_celular && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">✓ Celular</span>}
                    {anuncio.user.verificado_cpf && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">✓ CPF</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
