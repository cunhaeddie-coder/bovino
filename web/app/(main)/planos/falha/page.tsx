import Link from "next/link";

export default function PlanoFalhaPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Pagamento não concluído</h1>
        <p className="text-gray-500 mb-8">
          Houve um problema ao processar seu pagamento. Nenhum valor foi cobrado.
          Verifique os dados do cartão e tente novamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/planos"
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full transition"
          >
            Tentar novamente
          </Link>
          <Link
            href="/"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-3 rounded-full transition"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
