"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

type PlanoInfo = {
  id: number; nome: string; slug: string; preco: number;
  tipo: string; recursos: string[];
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
    </div>
  );
}

// Ícones dos métodos de pagamento aceitos
function MetodosPagamento() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Formas de pagamento aceitas</h2>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "💠", label: "PIX", sub: "Aprovação imediata" },
          { icon: "💳", label: "Crédito", sub: "Visa, Master, Elo" },
          { icon: "🏦", label: "Débito", sub: "Visa, Master" },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold text-gray-700">{label}</span>
            <span className="text-[10px] text-gray-400 text-center">{sub}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3 text-center">
        Pagamento 100% seguro via Mercado Pago · Criptografado SSL
      </p>
    </div>
  );
}

function CheckoutInner() {
  const searchParams        = useSearchParams();
  const router              = useRouter();
  const { token, setAuth }  = useAuthStore();
  const planoSlug           = searchParams.get("plano") ?? "";

  const [plano, setPlano]     = useState<PlanoInfo | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(false);
  const [payErr, setPayErr]   = useState("");
  const [modo, setModo]       = useState<"mp" | "simulado">("mp");

  // Fallback: formulário simulado
  const [card, setCard] = useState({ numero: "", nome: "", validade: "", cvv: "" });

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (!planoSlug) { router.push("/planos"); return; }

    api.get(`/planos/${planoSlug}`)
      .then((r) => setPlano(r.data))
      .catch(() => setLoadErr("Plano não encontrado."))
      .finally(() => setLoading(false));
  }, [planoSlug, token]);

  // Fluxo principal: MercadoPago Checkout Pro
  async function handlePagarMP() {
    if (!plano) return;
    setPaying(true); setPayErr("");
    try {
      const { data } = await api.post("/assinar", { plano_slug: plano.slug });
      const checkout = data.checkout;
      // Em sandbox usa sandbox_init_point, em produção usa init_point
      const url = process.env.NEXT_PUBLIC_MP_SANDBOX === "true"
        ? checkout.sandbox_init_point
        : checkout.init_point;
      window.location.href = url;
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 502) {
        // MP não configurado — fallback para simulação
        setModo("simulado");
        setPayErr("");
      } else {
        setPayErr(e.response?.data?.message ?? "Erro ao iniciar pagamento. Tente novamente.");
        setPaying(false);
      }
    }
  }

  // Fluxo fallback: checkout simulado
  async function handlePagarSimulado(e: React.FormEvent) {
    e.preventDefault();
    if (!plano) return;
    setPaying(true); setPayErr("");
    try {
      const { data: initData } = await api.post("/checkout/simular/iniciar", { plano_slug: plano.slug });
      await api.post(`/checkout/simular/${initData.assinatura_id}/confirmar`);
      if (token) {
        const u = await getMe().catch(() => null);
        if (u) setAuth(u, token);
      }
      router.push("/planos/sucesso?simulacao=1");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPayErr(e.response?.data?.message ?? "Erro ao processar pagamento.");
      setPaying(false);
    }
  }

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatValidade(v: string) {
    return v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
  }

  if (loading) return <Spinner />;

  if (loadErr) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 font-semibold">{loadErr}</p>
        <button onClick={() => router.push("/planos")} className="text-green-700 hover:underline text-sm">
          ← Voltar para os planos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/planos")} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">Finalizar assinatura</h1>
          {modo === "simulado" && (
            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
              Modo simulação
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Coluna esquerda — pagamento */}
          <div className="md:col-span-3 space-y-4">

            {/* Botão MercadoPago (modo principal) */}
            {modo === "mp" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-sm text-gray-500">Você será redirecionado para o ambiente seguro do</p>
                  <p className="font-bold text-blue-600 text-lg">Mercado Pago</p>
                  <p className="text-xs text-gray-400">PIX · Cartão de crédito · Débito · Google Pay</p>
                </div>

                {payErr && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {payErr}
                  </div>
                )}

                <button
                  onClick={handlePagarMP}
                  disabled={paying}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition disabled:opacity-60 flex items-center justify-center gap-3"
                >
                  {paying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Pagar {fmt(plano!.preco)}/mês com segurança
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex-1 border-t border-gray-100" />
                  <span>ou</span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                <button
                  onClick={() => setModo("simulado")}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
                >
                  Usar modo simulação (teste)
                </button>
              </div>
            )}

            {/* Formulário simulado (fallback) */}
            {modo === "simulado" && (
              <form onSubmit={handlePagarSimulado} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                  <strong>Modo simulação ativo.</strong> Nenhum valor será cobrado. Use qualquer dado fictício para testar o fluxo de assinatura.
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Número do cartão</label>
                    <input type="text" inputMode="numeric" value={card.numero} required
                      onChange={(e) => setCard({ ...card, numero: formatCardNumber(e.target.value) })}
                      placeholder="0000 0000 0000 0000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nome no cartão</label>
                    <input type="text" value={card.nome} required
                      onChange={(e) => setCard({ ...card, nome: e.target.value.toUpperCase() })}
                      placeholder="COMO ESTÁ NO CARTÃO"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Validade</label>
                      <input type="text" value={card.validade} required
                        onChange={(e) => setCard({ ...card, validade: formatValidade(e.target.value) })}
                        placeholder="MM/AA"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 focus:bg-white transition" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">CVV</label>
                      <input type="text" inputMode="numeric" value={card.cvv} required
                        onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="000"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 focus:bg-white transition" />
                    </div>
                  </div>
                </div>

                {payErr && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{payErr}</div>
                )}

                <button type="submit" disabled={paying}
                  className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {paying ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando...</>
                  ) : `Confirmar pagamento — ${fmt(plano!.preco)}/mês`}
                </button>

                <button type="button" onClick={() => setModo("mp")}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition">
                  ← Voltar para pagamento real
                </button>
              </form>
            )}

            <MetodosPagamento />
          </div>

          {/* Coluna direita — resumo */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Resumo do pedido</h2>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 font-extrabold text-sm">B</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{plano!.nome}</p>
                  <p className="text-xs text-gray-400 capitalize">{plano!.tipo}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plano mensal</span>
                  <span className="font-semibold text-gray-800">{fmt(plano!.preco)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-bold text-gray-900 text-sm">Total hoje</span>
                <span className="font-extrabold text-green-700 text-lg">{fmt(plano!.preco)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Incluído no plano</h2>
              <ul className="space-y-1.5">
                {plano!.recursos.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {r}
                  </li>
                ))}
                {plano!.recursos.length > 6 && (
                  <li className="text-xs text-gray-400 pl-5">+ {plano!.recursos.length - 6} benefícios</li>
                )}
              </ul>
            </div>

            <p className="text-center text-xs text-gray-400">Cancele quando quiser · Sem fidelidade</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CheckoutInner />
    </Suspense>
  );
}
