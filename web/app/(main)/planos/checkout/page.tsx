"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import type { IPaymentFormData } from "@mercadopago/sdk-react/esm/bricks/payment/type";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

// loadStripe fora do componente mas apenas no cliente (evita hydration mismatch no SSG)
const stripePromise = typeof window !== "undefined"
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? "")
  : null;
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

type PlanoInfo = {
  id: number; nome: string; slug: string; preco: number;
  tipo: string; recursos: string[];
};
type Tab = "pix" | "cartao";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function Spinner({ full = true }: { full?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${full ? "min-h-screen bg-gray-50" : "py-20"}`}>
      <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
    </div>
  );
}

function PixModal({ qrCode, qrBase64, onClose }: { qrCode: string; qrBase64: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
        <p className="text-2xl">💠</p>
        <h2 className="font-bold text-gray-900 text-lg">Pague com PIX</h2>
        <p className="text-xs text-gray-500">Escaneie o QR Code ou copie o código abaixo</p>
        {qrBase64 && (
          <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-xl border border-gray-200" />
        )}
        <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 break-all text-left max-h-24 overflow-y-auto">
          {qrCode}
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(qrCode); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition">
          {copiado ? "✓ Copiado!" : "Copiar código PIX"}
        </button>
        <p className="text-xs text-gray-400">O plano será ativado automaticamente após o pagamento.</p>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Fechar</button>
      </div>
    </div>
  );
}

function StripeCardForm({ plano, onSuccess, onError }: {
  plano: PlanoInfo;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setConfirming(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/planos/sucesso?status=approved&payment_type=credit_card`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Erro ao confirmar pagamento.");
      setConfirming(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={confirming || !stripe || !elements}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition">
        {confirming
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando...</>
          : `Confirmar pagamento — ${fmt(plano.preco)}/mês`}
      </button>
    </form>
  );
}

function CheckoutInner() {
  const searchParams          = useSearchParams();
  const router                = useRouter();
  const { token, setAuth, user } = useAuthStore();
  const planoSlug             = searchParams.get("plano") ?? "";

  const [plano, setPlano]             = useState<PlanoInfo | null>(null);
  const [assinaturaId, setAssinaturaId] = useState<number | null>(null);
  const [tab, setTab]                 = useState<Tab>("pix");
  const [loadErr, setLoadErr]         = useState("");
  const [loading, setLoading]         = useState(true);
  const [payErr, setPayErr]           = useState("");
  const [pixData, setPixData]         = useState<{ qrCode: string; qrBase64: string } | null>(null);
  const [mpPronto, setMpPronto]       = useState(false);
  const [modoSimulado, setModoSimulado] = useState(false);

  // Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading]           = useState(false);

  useEffect(() => {
    if (!MP_PUBLIC_KEY) { setModoSimulado(true); setMpPronto(true); return; }
    try {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      setMpPronto(true);
    } catch { setModoSimulado(true); setMpPronto(true); }
  }, []);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (!planoSlug) { router.push("/planos"); return; }

    Promise.all([
      api.get(`/planos/${planoSlug}`),
      api.post("/assinar", { plano_slug: planoSlug }),
    ])
      .then(([planoRes, assRes]) => {
        setPlano(planoRes.data);
        setAssinaturaId(assRes.data.assinatura_id);
      })
      .catch((e) => {
        const msg = e.response?.data?.message ?? "Erro ao iniciar checkout.";
        if (e.response?.status === 502) {
          api.get(`/planos/${planoSlug}`)
            .then((r) => { setPlano(r.data); setModoSimulado(true); })
            .catch(() => setLoadErr("Plano não encontrado."));
        } else {
          setLoadErr(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [planoSlug, token]);

  // Inicia Stripe Subscription quando usuário seleciona tab cartão
  async function handleSelectCartao() {
    setTab("cartao");
    setPayErr("");
    if (stripeClientSecret || !assinaturaId) return;
    setStripeLoading(true);
    try {
      const { data } = await api.post("/pagamento/stripe", { assinatura_id: assinaturaId });
      setStripeClientSecret(data.client_secret);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setPayErr(err.response?.data?.message ?? "Erro ao iniciar pagamento com cartão.");
    } finally {
      setStripeLoading(false);
    }
  }

  // Callback PIX Brick
  const onSubmitPix = useCallback(async (paymentData: IPaymentFormData) => {
    setPayErr("");
    try {
      const { data } = await api.post("/pagamento/pix", {
        assinatura_id: assinaturaId,
        ...paymentData.formData,
      });

      if (data.status === "approved") {
        if (token) { const u = await getMe().catch(() => null); if (u) setAuth(u, token); }
        router.push(`/planos/sucesso?status=approved&payment_type=${data.payment_type}`);
      } else if (data.status === "pending" && data.pix_qr_code) {
        setPixData({ qrCode: data.pix_qr_code, qrBase64: data.pix_qr_code_base64 ?? "" });
      } else if (data.status === "pending") {
        router.push(`/planos/sucesso?status=pending&payment_type=${data.payment_type}`);
      } else {
        setPayErr("Pagamento recusado. Verifique os dados e tente novamente.");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPayErr(e.response?.data?.message ?? "Erro ao processar pagamento.");
      throw err;
    }
  }, [assinaturaId, token]);

  const onErrorPix = useCallback((error: unknown) => {
    console.error("MP Brick error:", error);
    setPayErr("Erro no formulário de pagamento. Tente novamente.");
  }, []);

  async function handleStripeSuccess() {
    if (token) { const u = await getMe().catch(() => null); if (u) setAuth(u, token); }
    router.push("/planos/sucesso?status=approved&payment_type=credit_card");
  }

  if (loading || !mpPronto) return <Spinner />;
  if (loadErr) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-red-600 font-semibold">{loadErr}</p>
      <button onClick={() => router.push("/planos")} className="text-green-700 hover:underline text-sm">← Voltar para os planos</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {pixData && (
        <PixModal
          qrCode={pixData.qrCode}
          qrBase64={pixData.qrBase64}
          onClose={() => router.push("/planos/sucesso?status=pending&payment_type=pix")}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/planos")} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">Finalizar assinatura</h1>
          {modoSimulado && (
            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
              Modo simulação
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            {payErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{payErr}</div>
            )}

            {/* Tabs */}
            {!modoSimulado && assinaturaId && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setTab("pix"); setPayErr(""); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${tab === "pix" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-400"}`}>
                  💠 PIX
                </button>
                <button
                  onClick={handleSelectCartao}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${tab === "cartao" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>
                  💳 Cartão
                </button>
              </div>
            )}

            {/* PIX — MP Brick restrito a pix */}
            {!modoSimulado && mpPronto && plano && assinaturaId && tab === "pix" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <Payment
                  initialization={{
                    amount: plano.preco,
                    payer: {
                      email: user?.email ?? "",
                      identification: { type: "CPF", number: "" },
                    },
                  }}
                  customization={{
                    paymentMethods: { bankTransfer: "all" },
                    visual: { style: { customVariables: { formPadding: "24px" } } },
                  }}
                  onSubmit={onSubmitPix}
                  onError={onErrorPix}
                />
              </div>
            )}

            {/* Cartão — Stripe Payment Element */}
            {!modoSimulado && plano && assinaturaId && tab === "cartao" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                {stripeLoading && <Spinner full={false} />}

                {!stripeLoading && stripeClientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret: stripeClientSecret, locale: "pt-BR" }}>
                    <StripeCardForm
                      plano={plano}
                      onSuccess={handleStripeSuccess}
                      onError={(msg) => setPayErr(msg)}
                    />
                  </Elements>
                )}

                {!stripeLoading && !stripeClientSecret && (
                  <p className="text-center text-sm text-gray-400 py-8">Preparando checkout seguro...</p>
                )}
              </div>
            )}

            {/* Loading inicial */}
            {!modoSimulado && mpPronto && plano && !assinaturaId && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <Spinner full={false} />
                <p className="text-center text-sm text-gray-400 mt-2">Preparando checkout seguro...</p>
              </div>
            )}
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
                  <p className="font-bold text-gray-900 text-sm">{plano?.nome}</p>
                  <p className="text-xs text-gray-400 capitalize">{plano?.tipo}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plano mensal</span>
                  <span className="font-semibold text-gray-800">{fmt(plano?.preco ?? 0)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-bold text-gray-900 text-sm">Total hoje</span>
                <span className="font-extrabold text-green-700 text-lg">{fmt(plano?.preco ?? 0)}</span>
              </div>
            </div>

            {plano && plano.recursos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Incluído no plano</h2>
                <ul className="space-y-1.5">
                  {plano.recursos.slice(0, 6).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {r}
                    </li>
                  ))}
                  {plano.recursos.length > 6 && (
                    <li className="text-xs text-gray-400 pl-5">+ {plano.recursos.length - 6} benefícios</li>
                  )}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Formas de pagamento</p>
              <div className="flex flex-wrap gap-2">
                {["💠 PIX", "💳 Crédito / Débito"].map(m => (
                  <span key={m} className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg text-gray-600">{m}</span>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">
              Cancele quando quiser · Sem fidelidade<br />
              PIX via Mercado Pago · Cartão via Stripe
            </p>
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
