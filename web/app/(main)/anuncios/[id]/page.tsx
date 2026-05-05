import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { Anuncio } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function getAnuncio(id: string): Promise<Anuncio | null> {
  try {
    const { data } = await api.get(`/anuncios/${id}`);
    return data;
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
  const fotos = anuncio.midias?.filter((m) => m.tipo === "foto") ?? [];

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
        {fotos.length > 0 && (
          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-gray-200">
            <Image src={fotos[0].url} alt={anuncio.titulo} fill className="object-cover" priority />
          </div>
        )}

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
        </div>

        {anuncio.user && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Vendedor</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">👤</div>
              <div>
                <p className="font-semibold">{anuncio.user.nome}</p>
                <p className="text-sm text-gray-500">{anuncio.user.municipio}/{anuncio.user.estado}</p>
                <div className="flex gap-2 mt-1">
                  {anuncio.user.verificado_celular && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">✓ Celular</span>}
                  {anuncio.user.verificado_cpf && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">✓ CPF</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
