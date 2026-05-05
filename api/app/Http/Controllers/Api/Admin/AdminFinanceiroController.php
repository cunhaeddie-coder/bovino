<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Pagamento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFinanceiroController extends Controller
{
    public function assinaturas(Request $request): JsonResponse
    {
        $query = Assinatura::with(['plano', 'assinante'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('plano_id')) {
            $query->where('plano_id', $request->plano_id);
        }

        return response()->json($query->paginate(25));
    }

    public function pagamentos(Request $request): JsonResponse
    {
        $query = Pagamento::with(['assinatura.plano', 'assinatura.assinante'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('de')) {
            $query->where('created_at', '>=', $request->de);
        }

        if ($request->filled('ate')) {
            $query->where('created_at', '<=', $request->ate . ' 23:59:59');
        }

        return response()->json($query->paginate(25));
    }

    public function cancelarAssinatura(int $id): JsonResponse
    {
        $assinatura = Assinatura::findOrFail($id);
        $assinatura->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        return response()->json(['message' => 'Assinatura cancelada pelo admin.']);
    }

    public function ativarAssinatura(Request $request, int $id): JsonResponse
    {
        $assinatura = Assinatura::findOrFail($id);
        $assinatura->update([
            'status'    => 'ativa',
            'inicia_em' => now(),
            'expira_em' => now()->addMonth(),
        ]);

        return response()->json(['message' => 'Assinatura ativada manualmente.']);
    }
}
