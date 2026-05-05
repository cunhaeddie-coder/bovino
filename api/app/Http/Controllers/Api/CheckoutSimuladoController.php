<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Pagamento;
use App\Models\Plano;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CheckoutSimuladoController extends Controller
{
    /**
     * Inicia o checkout simulado: cria assinatura pendente e retorna
     * os dados do plano para o frontend renderizar a tela de pagamento fictício.
     */
    public function iniciar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plano_slug' => ['required', 'string', 'exists:planos,slug'],
        ]);

        $plano     = Plano::where('slug', $data['plano_slug'])->firstOrFail();
        $assinante = $request->user();

        if ($plano->tipo === 'anunciante' && !($assinante instanceof \App\Models\Anunciante)) {
            return response()->json(['message' => 'Este plano é exclusivo para anunciantes.'], 403);
        }

        // Cancela assinatura ativa anterior (plano diferente)
        $assinante->assinaturas()
            ->where('status', 'ativa')
            ->where('plano_id', '!=', $plano->id)
            ->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        // Reutiliza assinatura pendente existente ou cria nova
        $assinatura = $assinante->assinaturas()
            ->where('plano_id', $plano->id)
            ->where('status', 'pendente')
            ->latest()
            ->first();

        if (!$assinatura) {
            $assinatura = Assinatura::create([
                'assinante_type' => get_class($assinante),
                'assinante_id'   => $assinante->id,
                'plano_id'       => $plano->id,
                'status'         => 'pendente',
                'valor'          => $plano->preco,
            ]);
        }

        return response()->json([
            'assinatura_id' => $assinatura->id,
            'plano' => [
                'id'       => $plano->id,
                'nome'     => $plano->nome,
                'slug'     => $plano->slug,
                'preco'    => $plano->preco,
                'tipo'     => $plano->tipo,
                'recursos' => $plano->recursos,
            ],
        ]);
    }

    /**
     * Confirma o pagamento fictício: aprova assinatura + cria pagamento simulado.
     */
    public function confirmar(Request $request, int $assinaturaId): JsonResponse
    {
        $assinatura = Assinatura::findOrFail($assinaturaId);

        // Garante que pertence ao usuário autenticado
        if (
            $assinatura->assinante_type !== get_class($request->user()) ||
            $assinatura->assinante_id   !== $request->user()->id
        ) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($assinatura->status === 'ativa') {
            return response()->json(['message' => 'Assinatura já está ativa.'], 409);
        }

        // Cria pagamento fictício aprovado
        Pagamento::create([
            'assinatura_id'    => $assinatura->id,
            'valor'            => $assinatura->valor,
            'status'           => 'aprovado',
            'gateway_id'       => 'SIM-' . strtoupper(Str::random(10)),
            'metodo'           => 'simulacao',
            'gateway_response' => ['simulado' => true, 'approved_at' => now()->toIso8601String()],
            'pago_em'          => now(),
        ]);

        // Ativa a assinatura
        $assinatura->update([
            'status'    => 'ativa',
            'inicia_em' => now(),
            'expira_em' => now()->addMonth(),
        ]);

        // Atualiza o campo plano do usuário para refletir a assinatura ativa
        $assinatura->assinante->update(['plano' => 'premium']);

        return response()->json([
            'message'       => 'Pagamento confirmado com sucesso.',
            'assinatura_id' => $assinatura->id,
        ]);
    }
}
