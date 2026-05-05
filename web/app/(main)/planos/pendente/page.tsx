import Link from "next/link";

export default function PlanoPendentePage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Pagamento em análise</h1>
        <p className="text-gray-500 mb-4">
          Seu pagamento foi recebido e está sendo processado. Isso pode levar alguns minutos.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Você receberá uma confirmação assim que o pagamento for aprovado. Seu plano será ativado automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/perfil"
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full transition"
          >
            Ir para meu perfil
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
