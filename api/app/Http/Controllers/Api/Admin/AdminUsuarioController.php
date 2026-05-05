<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Pagamento;
use App\Models\Plano;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminUsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::withTrashed()
            ->with(['assinaturaAtiva.plano'])
            ->withCount(['anuncios', 'assinaturas']);

        if ($request->filled('busca')) {
            $b = $request->busca;
            $query->where(fn($q) => $q
                ->where('nome', 'like', "%{$b}%")
                ->orWhere('email', 'like', "%{$b}%")
                ->orWhere('celular', 'like', "%{$b}%")
            );
        }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('status')) {
            match ($request->status) {
                'ativo'    => $query->whereNull('deleted_at'),
                'inativo'  => $query->onlyTrashed(),
                'bloqueado'=> $query->where('bloqueado_ate', '>', now()),
                default    => null,
            };
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $usuarios = $query->orderByDesc('created_at')->paginate(25);

        return response()->json($usuarios);
    }

    public function show(int $id): JsonResponse
    {
        $usuario = User::withTrashed()
            ->with(['assinaturas.plano', 'anuncios' => fn($q) => $q->latest()->limit(5)])
            ->withCount(['anuncios', 'assinaturas'])
            ->findOrFail($id);

        return response()->json($usuario);
    }

    public function bloquear(Request $request, int $id): JsonResponse
    {
        $usuario = User::findOrFail($id);
        $horas   = $request->input('horas', 24);

        $usuario->update(['bloqueado_ate' => now()->addHours($horas)]);

        return response()->json(['message' => "Usuário bloqueado por {$horas}h."]);
    }

    public function desbloquear(int $id): JsonResponse
    {
        $usuario = User::findOrFail($id);
        $usuario->update(['bloqueado_ate' => null, 'tentativas_login' => 0]);

        return response()->json(['message' => 'Usuário desbloqueado.']);
    }

    public function desativar(int $id): JsonResponse
    {
        $usuario = User::findOrFail($id);
        $usuario->delete();

        return response()->json(['message' => 'Usuário desativado.']);
    }

    public function reativar(int $id): JsonResponse
    {
        $usuario = User::withTrashed()->findOrFail($id);
        $usuario->restore();

        return response()->json(['message' => 'Usuário reativado.']);
    }

    /**
     * Ativa um plano diretamente para o usuário (ferramenta de testes).
     */
    public function simularPlano(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'plano_slug' => ['required', 'string', 'exists:planos,slug'],
        ]);

        $usuario = User::findOrFail($id);
        $plano   = Plano::where('slug', $data['plano_slug'])->firstOrFail();

        // Cancela assinaturas ativas anteriores
        $usuario->assinaturas()
            ->where('status', 'ativa')
            ->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        $assinatura = Assinatura::create([
            'assinante_type' => User::class,
            'assinante_id'   => $usuario->id,
            'plano_id'       => $plano->id,
            'status'         => 'ativa',
            'valor'          => $plano->preco,
            'inicia_em'      => now(),
            'expira_em'      => now()->addYear(),
        ]);

        Pagamento::create([
            'assinatura_id'    => $assinatura->id,
            'valor'            => $plano->preco,
            'status'           => 'aprovado',
            'gateway_id'       => 'ADM-' . strtoupper(Str::random(8)),
            'metodo'           => 'admin_simulacao',
            'gateway_response' => ['simulado_por' => 'admin', 'at' => now()->toIso8601String()],
            'pago_em'          => now(),
        ]);

        $usuario->update(['plano' => 'premium']);

        return response()->json([
            'message' => "Plano {$plano->nome} ativado para {$usuario->nome}.",
            'assinatura_id' => $assinatura->id,
        ]);
    }
}
