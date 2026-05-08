<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Plano;
use App\Services\Payment\MercadoPagoPaymentService;
use App\Services\Payment\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssinaturaController extends Controller
{
    /**
     * Cria a assinatura em estado pendente.
     * O pagamento é processado em seguida via /pagamento/pix ou /pagamento/stripe.
     */
    public function assinar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plano_slug' => ['required', 'string', 'exists:planos,slug'],
        ]);

        $plano     = Plano::where('slug', $data['plano_slug'])->firstOrFail();
        $assinante = $request->user();

        if ($plano->tipo === 'anunciante' && !($assinante instanceof \App\Models\Anunciante)) {
            return response()->json(['message' => 'Este plano é exclusivo para anunciantes.'], 403);
        }

        $assinante->assinaturas()
            ->where('status', 'ativa')
            ->where('plano_id', '!=', $plano->id)
            ->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        $assinatura = Assinatura::create([
            'assinante_type' => get_class($assinante),
            'assinante_id'   => $assinante->id,
            'plano_id'       => $plano->id,
            'status'         => 'pendente',
            'valor'          => $plano->preco,
        ]);

        return response()->json([
            'assinatura_id'   => $assinatura->id,
            'stripe_price_id' => $plano->stripe_price_id,
        ], 201);
    }

    /**
     * Processa pagamento PIX via Mercado Pago Checkout Bricks.
     */
    public function pagarPix(Request $request, MercadoPagoPaymentService $mp): JsonResponse
    {
        $data = $request->validate([
            'assinatura_id'     => ['required', 'integer'],
            'payment_method_id' => ['required', 'string'],
            'token'             => ['nullable', 'string'],
            'installments'      => ['nullable', 'integer'],
            'issuer_id'         => ['nullable', 'string'],
            'payer'             => ['nullable', 'array'],
            'payer.email'       => ['nullable', 'email'],
        ]);

        $assinatura = Assinatura::findOrFail($data['assinatura_id']);

        if ($assinatura->assinante_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        try {
            $resultado = $mp->iniciarPagamento($assinatura, $data);
            return response()->json($resultado);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    /**
     * Cria Stripe Customer + Subscription e retorna o client_secret
     * para o Payment Element confirmar o pagamento no frontend.
     */
    public function pagarStripe(Request $request, StripePaymentService $stripe): JsonResponse
    {
        $data = $request->validate([
            'assinatura_id' => ['required', 'integer'],
        ]);

        $assinatura = Assinatura::with('plano')->findOrFail($data['assinatura_id']);

        if ($assinatura->assinante_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if (empty($assinatura->plano->stripe_price_id)) {
            return response()->json(['message' => 'Plano não configurado para cartão.'], 422);
        }

        try {
            $resultado = $stripe->iniciarPagamento($assinatura, []);
            return response()->json($resultado);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    public function minhaAssinatura(Request $request): JsonResponse
    {
        $assinatura = $request->user()->assinaturaAtiva();
        return response()->json($assinatura?->load('plano'));
    }

    public function cancelar(Request $request, MercadoPagoPaymentService $mp, StripePaymentService $stripe): JsonResponse
    {
        $assinatura = $request->user()->assinaturas()
            ->where('status', 'ativa')
            ->latest()
            ->firstOrFail();

        if ($assinatura->gateway === 'stripe') {
            $stripe->cancelarAssinatura($assinatura);
        } else {
            $mp->cancelarAssinatura($assinatura);
        }

        return response()->json(['message' => 'Assinatura cancelada. Permanece ativa até o fim do período pago.']);
    }
}
