import Link from "next/link";
import { Plano } from "@/lib/types";
import PlanoCardAction from "./PlanoCardAction";
import { serverFetch } from "@/lib/api-server";

async function getPlanos(): Promise<{ grupos: Record<string, Plano[]>; erro?: string }> {
  try {
    const grupos = await serverFetch<Record<string, Plano[]>>("/planos", { revalidate: 0 });
    return { grupos };
  } catch (e) {
    return { grupos: {}, erro: String(e) };
  }
}

function formatPreco(preco: number) {
  return preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PlanoCard({ plano, destaque }: { plano: Plano; destaque?: boolean }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border ${destaque ? "border-green-500 shadow-xl shadow-green-500/10" : "border-gray-200 shadow-md"} bg-white overflow-hidden`}>
      {destaque && (
        <div className="bg-green-500 text-white text-xs font-bold text-center py-1.5 tracking-widest uppercase">
          Mais popular
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900">{plano.nome}</h3>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900">{formatPreco(plano.preco)}</span>
          <span className="text-gray-400 text-sm mb-1">/mês</span>
        </div>

        <ul className="mt-6 space-y-2.5 flex-1">
          {plano.recursos.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckIcon />
              {r}
            </li>
          ))}
        </ul>

        <PlanoCardAction plano={plano} destaque={destaque} />
      </div>
    </div>
  );
}

export default async function PlanosPage() {
  const { grupos, erro } = await getPlanos();

  const compradores = grupos["comprador"] ?? [];
  const produtores = grupos["produtor"] ?? [];
  // planos de anunciante não exibidos publicamente

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-linear-to-br from-green-900 via-green-800 to-green-700 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Planos para cada perfil
        </h1>
        <p className="text-green-100 text-lg max-w-2xl mx-auto">
          Escolha o plano ideal para comprar, vender ou anunciar no maior marketplace de gado do Brasil.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-20">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
            Erro ao carregar planos: {erro}
          </div>
        )}

        {/* PRODUTORES */}
        {produtores.length > 0 && (
          <section>
            <div className="text-center mb-10">
              <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                Produtores rurais
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900">Venda mais, alcance mais</h2>
              <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
                Publique anúncios com fotos, vídeos e destaques. Chegue a milhares de compradores.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {produtores.map((p, i) => (
                <PlanoCard key={p.id} plano={p} destaque={i === 1} />
              ))}
            </div>
          </section>
        )}

        {/* COMPRADORES */}
        {compradores.length > 0 && (
          <section>
            <div className="text-center mb-10">
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                Compradores de gado
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900">Encontre o boi certo</h2>
              <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
                Acesso ao contato direto dos vendedores, alertas de preço e filtros avançados.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                {compradores.map((p) => (
                  <PlanoCard key={p.id} plano={p} destaque />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Rodapé — link para empresas */}
        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          Empresa do agro?{" "}
          <Link href="/anunciante/interesse" className="text-green-700 font-semibold hover:underline">
            Fale com nosso comercial →
          </Link>
        </div>

      </div>
    </main>
  );
}
