"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

function SucessoInner() {
  const router              = useRouter();
  const searchParams        = useSearchParams();
  const { token, setAuth }  = useAuthStore();

  // Parâmetros enviados pelo MercadoPago no redirect de volta
  const status        = searchParams.get("status");          // approved | pending | rejected
  const paymentType   = searchParams.get("payment_type");    // pix | credit_card | debit_card
  const isSimulacao   = searchParams.get("simulacao") === "1";

  const [userAtualizado, setUserAtualizado] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Aguarda 2s para dar tempo do webhook processar antes de atualizar o user
    const delay = isSimulacao ? 0 : 2000;
    const t = setTimeout(() => {
      getMe()
        .then((u) => { setAuth(u, token); setUserAtualizado(true); })
        .catch(() => setUserAtualizado(true));
    }, delay);
    return () => clearTimeout(t);
  }, [token]);

  useEffect(() => {
    if (!userAtualizado) return;
    const t = setTimeout(() => router.push("/perfil"), 5000);
    return () => clearTimeout(t);
  }, [userAtualizado]);

  // Pendente (PIX aguardando pagamento, etc.)
  if (status === "pending") {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">💠</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Pagamento em processamento</h1>
          <p className="text-gray-500 mb-2">
            {paymentType === "pix"
              ? "Seu PIX foi gerado. Após a confirmação do pagamento, seu plano será ativado automaticamente."
              : "Seu pagamento está sendo processado. Assim que confirmado, seu plano será ativado."}
          </p>
          <p className="text-sm text-gray-400 mb-8">Você receberá um e-mail de confirmação do Mercado Pago.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/perfil" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full transition">
              Ver meu perfil
            </Link>
            <Link href="/planos" className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-3 rounded-full transition">
              Ver planos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Aprovado (cartão, débito, Google Pay, simulação)
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          {isSimulacao ? "Assinatura ativada! (simulação)" : "Pagamento aprovado!"}
        </h1>
        <p className="text-gray-500 mb-2">
          Seu plano foi ativado com sucesso. Você já tem acesso a todos os recursos incluídos.
        </p>
        {paymentType && !isSimulacao && (
          <p className="text-sm text-green-600 font-medium mb-6">
            Pago via {paymentType === "pix" ? "💠 PIX" : paymentType === "credit_card" ? "💳 Cartão de crédito" : paymentType === "debit_card" ? "🏦 Cartão de débito" : "💳 " + paymentType}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Link href="/perfil" className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full transition">
            Ver meu perfil
          </Link>
          <Link href="/busca" className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-3 rounded-full transition">
            Explorar anúncios
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">Você será redirecionado automaticamente em alguns segundos...</p>
      </div>
    </main>
  );
}

export default function PlanoSucessoPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <SucessoInner />
    </Suspense>
  );
}
