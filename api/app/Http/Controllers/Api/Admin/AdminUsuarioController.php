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

        $assinatura->ativar(now()->addYear());

        return response()->json([
            'message' => "Plano {$plano->nome} ativado para {$usuario->nome}.",
            'assinatura_id' => $assinatura->id,
        ]);
    }

    public function cadastrar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome'     => 'required|string|max:120',
            'celular'  => 'required|string|max:20|unique:users,celular',
            'email'    => 'nullable|email|unique:users,email',
            'tipo'     => 'required|in:vendedor,comprador,ambos',
            'estado'   => 'nullable|string|size:2',
            'municipio'=> 'nullable|string|max:120',
        ]);

        $data['celular']             = preg_replace('/\D/', '', $data['celular']);
        $data['password']            = bcrypt(Str::random(12));
        $data['verificado_celular']  = false;
        $data['plano']               = 'free';

        $usuario = User::create($data);

        return response()->json([
            'message' => 'Cliente cadastrado. Ele pode fazer login via OTP no celular.',
            'usuario' => $usuario->only(['id', 'nome', 'celular', 'email', 'tipo']),
        ], 201);
    }

    public function criarAssinaturaManual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usuario_id' => 'required|exists:users,id',
            'plano_slug' => 'required|exists:planos,slug',
            'periodo'    => 'required|in:mensal,anual',
        ]);

        $usuario = User::findOrFail($data['usuario_id']);
        $plano   = Plano::where('slug', $data['plano_slug'])->firstOrFail();
        $periodo = $data['periodo'];
        $valor   = $periodo === 'anual' && $plano->preco_anual ? $plano->preco_anual : $plano->preco;

        // Cancela assinatura ativa anterior
        $usuario->assinaturas()
            ->where('status', 'ativa')
            ->update(['status' => 'cancelada', 'cancelada_em' => now()]);

        $assinatura = Assinatura::create([
            'assinante_type' => User::class,
            'assinante_id'   => $usuario->id,
            'plano_id'       => $plano->id,
            'status'         => 'pendente',
            'periodo'        => $periodo,
            'gateway'        => 'manual',
            'valor'          => $valor,
        ]);

        $pixCnpj  = config('bovino.pix_cnpj', '12407190000145');
        $pixNome  = config('bovino.pix_nome', 'BOVINO MARKETPLACE LTDA');

        return response()->json([
            'assinatura_id' => $assinatura->id,
            'usuario'       => $usuario->only(['id', 'nome', 'celular']),
            'plano'         => ['nome' => $plano->nome, 'slug' => $plano->slug],
            'periodo'       => $periodo,
            'valor'         => $valor,
            'pix' => [
                'chave' => $pixCnpj,
                'nome'  => $pixNome,
                'valor' => number_format($valor, 2, ',', '.'),
            ],
            'message' => 'Assinatura criada. Compartilhe os dados do PIX com o cliente e confirme após o pagamento.',
        ], 201);
    }

    public function confirmarPix(Request $request, int $assinaturaId): JsonResponse
    {
        $assinatura = Assinatura::with(['assinante', 'plano'])
            ->where('gateway', 'manual')
            ->where('status', 'pendente')
            ->findOrFail($assinaturaId);

        Pagamento::create([
            'assinatura_id'    => $assinatura->id,
            'valor'            => $assinatura->valor,
            'status'           => 'aprovado',
            'gateway_id'       => 'PIX-' . strtoupper(Str::random(10)),
            'metodo'           => 'pix_manual',
            'gateway_response' => [
                'confirmado_por' => 'admin',
                'admin_id'       => $request->user()?->id,
                'at'             => now()->toIso8601String(),
            ],
            'pago_em' => now(),
        ]);

        $assinatura->ativar();

        return response()->json([
            'message'   => "PIX confirmado. Plano {$assinatura->plano->nome} ativo para {$assinatura->assinante->nome}.",
            'expira_em' => $assinatura->fresh()->expira_em,
        ]);
    }
}
