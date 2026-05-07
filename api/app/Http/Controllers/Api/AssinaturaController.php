<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Plano;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssinaturaController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    public function assinar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plano_slug' => ['required', 'string', 'exists:planos,slug'],
        ]);

        $plano = Plano::where('slug', $data['plano_slug'])->firstOrFail();
        $assinante = $request->user();

        // Verifica compatibilidade de tipo
        $tipoAssinante = $assinante instanceof \App\Models\Anunciante ? 'anunciante' : $assinante->tipo;

        if ($plano->tipo === 'anunciante' && !($assinante instanceof \App\Models\Anunciante)) {
            return response()->json(['message' => 'Este plano é exclusivo para anunciantes.'], 403);
        }

        // Cancela assinatura ativa anterior se houver
        $assinante->assinaturas()
            ->where('status', 'ativa')
            ->where('plano_id', '!=', $plano->id)
            ->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        $assinatura = Assinatura::create([
            'assinante_type' => get_class($assinante),
            'assinante_id' => $assinante->id,
            'plano_id' => $plano->id,
            'status' => 'pendente',
            'valor' => $plano->preco,
        ]);

        try {
            $checkout = $this->mp->criarPreference($assinatura);
            return response()->json([
                'assinatura_id' => $assinatura->id,
                'checkout' => $checkout,
            ], 201);
        } catch (\RuntimeException $e) {
            $assinatura->delete();
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    public function processarBrick(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assinatura_id'    => ['required', 'integer'],
            'payment_method_id'=> ['required', 'string'],
            'token'            => ['nullable', 'string'],
            'installments'     => ['nullable', 'integer'],
            'issuer_id'        => ['nullable', 'string'],
            'payer'            => ['nullable', 'array'],
            'payer.email'      => ['nullable', 'email'],
        ]);

        $assinatura = Assinatura::findOrFail($data['assinatura_id']);

        if ($assinatura->assinante_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        try {
            $resultado = $this->mp->criarPagamentoBrick($assinatura, $data);
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

    public function cancelar(Request $request): JsonResponse
    {
        $assinatura = $request->user()->assinaturas()
            ->where('status', 'ativa')
            ->latest()
            ->firstOrFail();

        $assinatura->update([
            'status' => 'cancelada',
            'cancelada_em' => now(),
        ]);

        return response()->json(['message' => 'Assinatura cancelada. Permanece ativa até o fim do período pago.']);
    }
}
