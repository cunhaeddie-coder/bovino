"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import type { IPaymentFormData } from "@mercadopago/sdk-react/esm/bricks/payment/type";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

type PlanoInfo = {
  id: number; nome: string; slug: string; preco: number;
  tipo: string; recursos: string[];
};

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

// PIX QR Code modal
function PixModal({ qrCode, qrBase64, onClose }: { qrCode: string; qrBase64: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard?.writeText(qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
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
        <button onClick={copiar}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition">
          {copiado ? "✓ Copiado!" : "Copiar código PIX"}
        </button>
        <p className="text-xs text-gray-400">O plano será ativado automaticamente após o pagamento.</p>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Fechar</button>
      </div>
    </div>
  );
}

function CheckoutInner() {
  const searchParams        = useSearchParams();
  const router              = useRouter();
  const { token, setAuth }  = useAuthStore();
  const planoSlug           = searchParams.get("plano") ?? "";

  const [plano, setPlano]           = useState<PlanoInfo | null>(null);
  const [assinaturaId, setAssinaturaId] = useState<number | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadErr, setLoadErr]       = useState("");
  const [loading, setLoading]       = useState(true);
  const [payErr, setPayErr]         = useState("");
  const [pixData, setPixData]       = useState<{ qrCode: string; qrBase64: string } | null>(null);
  const [mpPronto, setMpPronto]     = useState(false);

  // Modo fallback simulação
  const [modoSimulado, setModoSimulado] = useState(false);
  const [simulando, setSimulando]       = useState(false);
  const [card, setCard] = useState({ numero: "", nome: "", validade: "", cvv: "" });

  // Inicializa MP
  useEffect(() => {
    if (!MP_PUBLIC_KEY) { setModoSimulado(true); setMpPronto(true); return; }
    try {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      setMpPronto(true);
    } catch { setModoSimulado(true); setMpPronto(true); }
  }, []);

  // Carrega plano e cria assinatura
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
        setPreferenceId(assRes.data.checkout?.preference_id ?? null);
      })
      .catch((e) => {
        const msg = e.response?.data?.message ?? "Erro ao iniciar checkout.";
        if (e.response?.status === 502) {
          // MP não configurado: carrega só o plano e vai para simulação
          api.get(`/planos/${planoSlug}`)
            .then((r) => { setPlano(r.data); setModoSimulado(true); })
            .catch(() => setLoadErr("Plano não encontrado."));
        } else {
          setLoadErr(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [planoSlug, token]);

  // Callback do Brick ao submeter pagamento
  const onSubmit = useCallback(async (formData: IPaymentFormData) => {
    setPayErr("");
    try {
      const { data } = await api.post("/pagamento/brick", {
        assinatura_id: assinaturaId,
        ...formData,
      });

      if (data.status === "approved") {
        if (token) {
          const u = await getMe().catch(() => null);
          if (u) setAuth(u, token);
        }
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
      throw err; // Brick precisa que a Promise rejeite para mostrar erro interno
    }
  }, [assinaturaId, token]);

  const onError = useCallback((error: unknown) => {
    console.error("MP Brick error:", error);
    setPayErr("Erro no formulário de pagamento. Tente novamente.");
  }, []);

  // Simulação fallback
  async function handleSimulado(e: React.FormEvent) {
    e.preventDefault();
    if (!plano) return;
    setSimulando(true); setPayErr("");
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
      setPayErr(e.response?.data?.message ?? "Erro ao processar.");
      setSimulando(false);
    }
  }

  function formatCardNumber(v: string) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function formatValidade(v: string)   { return v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2"); }

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
          {/* Coluna esquerda — pagamento */}
          <div className="md:col-span-3">
            {payErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{payErr}</div>
            )}

            {/* Checkout Bricks */}
            {!modoSimulado && mpPronto && plano && preferenceId && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <Payment
                  initialization={{
                    amount: plano.preco,
                    preferenceId,
                  }}
                  customization={{
                    paymentMethods: {
                      ticket: "all",
                      bankTransfer: "all",
                      creditCard: "all",
                      debitCard: "all",
                      mercadoPago: "all",
                    },
                    visual: {
                      style: {
                        customVariables: {
                          formPadding: "24px",
                        },
                      },
                    },
                  }}
                  onSubmit={onSubmit}
                  onError={onError}
                />
              </div>
            )}

            {/* Loading enquanto preferenceId não chegou */}
            {!modoSimulado && mpPronto && plano && !preferenceId && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <Spinner full={false} />
                <p className="text-center text-sm text-gray-400 mt-2">Preparando checkout seguro...</p>
              </div>
            )}

            {/* Fallback simulação */}
            {modoSimulado && (
              <form onSubmit={handleSimulado} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                  <strong>Modo simulação.</strong> Nenhum valor será cobrado. Use qualquer dado fictício.
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Número do cartão</label>
                    <input type="text" inputMode="numeric" value={card.numero} required
                      onChange={(e) => setCard({ ...card, numero: formatCardNumber(e.target.value) })}
                      placeholder="0000 0000 0000 0000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nome no cartão</label>
                    <input type="text" value={card.nome} required
                      onChange={(e) => setCard({ ...card, nome: e.target.value.toUpperCase() })}
                      placeholder="COMO ESTÁ NO CARTÃO"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Validade</label>
                      <input type="text" value={card.validade} required
                        onChange={(e) => setCard({ ...card, validade: formatValidade(e.target.value) })}
                        placeholder="MM/AA"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">CVV</label>
                      <input type="text" inputMode="numeric" value={card.cvv} required
                        onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="000"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={simulando}
                  className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {simulando
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando...</>
                    : `Confirmar pagamento — ${fmt(plano?.preco ?? 0)}/mês`}
                </button>
              </form>
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
                {["💠 PIX", "💳 Crédito", "🏦 Débito", "📱 Google Pay"].map(m => (
                  <span key={m} className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg text-gray-600">{m}</span>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">Cancele quando quiser · Sem fidelidade<br/>Pagamento seguro via Mercado Pago</p>
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
