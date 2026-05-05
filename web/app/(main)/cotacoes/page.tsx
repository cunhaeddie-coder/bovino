import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Cotacao } from "@/lib/types";

export const metadata: Metadata = { title: "Cotações" };

const TIPO_LABEL = { boi_gordo: "Boi Gordo", bezerro: "Bezerro", vaca: "Vaca" } as const;

async function getCotacoes(): Promise<Record<string, Cotacao>> {
  try {
    const { data } = await api.get("/cotacoes/ultima");
    return data;
  } catch {
    return {};
  }
}

export default async function CotacoesPage() {
  const cotacoes = await getCotacoes();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="font-bold">🐄 Bovino</Link>
          <span className="text-green-300">/</span>
          <span className="text-sm text-green-200">Cotações</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Cotações do Boi</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["boi_gordo", "bezerro", "vaca"] as const).map((tipo) => {
            const c = cotacoes[tipo];
            return (
              <div key={tipo} className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-gray-500">{TIPO_LABEL[tipo]}</p>
                {c ? (
                  <>
                    <p className="text-3xl font-bold text-green-700 mt-1">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.preco_arroba)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">por arroba · {c.fonte}</p>
                    <p className="text-xs text-gray-400">{new Date(c.referencia_em).toLocaleDateString("pt-BR")}</p>
                  </>
                ) : (
                  <p className="text-gray-400 mt-2 text-sm">Sem dados</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
