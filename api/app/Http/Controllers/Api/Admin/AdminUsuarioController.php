<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Negociacao;
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
            ->with(['assinaturas' => fn($q) => $q->where('status', 'ativa')->with('plano')->latest()])
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

    public function atividade(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        $eventos = collect();

        // Cadastro
        $eventos->push(['tipo' => 'cadastro', 'icon' => '🎉', 'titulo' => 'Cadastro na plataforma', 'descricao' => null, 'at' => $user->created_at]);

        // Anúncios
        $user->anuncios()->withTrashed()->latest()->limit(30)->get()
            ->each(fn($a) => $eventos->push([
                'tipo' => 'anuncio', 'icon' => '🐄',
                'titulo' => 'Anúncio criado: ' . $a->titulo,
                'descricao' => 'R$ ' . number_format($a->preco_unitario, 2, ',', '.') . '/cab · ' . ($a->deleted_at ? 'removido' : 'ativo'),
                'at' => $a->created_at,
            ]));

        // Negociações como comprador
        Negociacao::where('comprador_id', $id)->with('vendedor:id,nome')->latest()->limit(20)->get()
            ->each(fn($n) => $eventos->push([
                'tipo' => 'negociacao', 'icon' => '💬',
                'titulo' => 'Negociação iniciada com ' . ($n->vendedor->nome ?? 'vendedor'),
                'descricao' => 'Status: ' . $n->status . ($n->preco_proposto ? ' · R$ ' . number_format($n->preco_proposto, 2, ',', '.') . '/cab' : ''),
                'at' => $n->created_at,
            ]));

        // Negociações como vendedor
        Negociacao::where('vendedor_id', $id)->with('comprador:id,nome')->latest()->limit(20)->get()
            ->each(fn($n) => $eventos->push([
                'tipo' => 'negociacao', 'icon' => '🤝',
                'titulo' => 'Proposta recebida de ' . ($n->comprador->nome ?? 'comprador'),
                'descricao' => 'Status: ' . $n->status . ($n->preco_proposto ? ' · R$ ' . number_format($n->preco_proposto, 2, ',', '.') . '/cab' : ''),
                'at' => $n->created_at,
            ]));

        // Assinaturas
        $user->assinaturas()->with('plano:id,nome')->latest()->limit(10)->get()
            ->each(fn($a) => $eventos->push([
                'tipo' => 'assinatura', 'icon' => '⭐',
                'titulo' => 'Assinatura: ' . ($a->plano->nome ?? 'plano'),
                'descricao' => 'Status: ' . $a->status . ' · R$ ' . number_format($a->valor, 2, ',', '.'),
                'at' => $a->created_at,
            ]));

        // Avaliações enviadas
        \App\Models\Avaliacao::where('comprador_id', $id)->with('vendedor:id,nome')->latest()->limit(10)->get()
            ->each(fn($av) => $eventos->push([
                'tipo' => 'avaliacao', 'icon' => '⭐',
                'titulo' => 'Avaliou ' . ($av->vendedor->nome ?? 'vendedor') . ': ' . $av->nota . '/5',
                'descricao' => $av->comentario,
                'at' => $av->created_at,
            ]));

        return response()->json(
            $eventos->sortByDesc('at')->values()->map(fn($e) => [
                ...$e,
                'at' => $e['at']?->toISOString(),
            ])
        );
    }

    public function atividadeGlobal(Request $request): JsonResponse
    {
        $eventos = collect();
        $limit = 50;

        \App\Models\Anuncio::with('user:id,nome')->latest()->limit($limit)->get()
            ->each(fn($a) => $eventos->push([
                'tipo' => 'anuncio', 'icon' => '🐄', 'user' => $a->user?->nome ?? '—',
                'titulo' => 'Anúncio criado: ' . $a->titulo,
                'descricao' => 'R$ ' . number_format($a->preco_unitario, 2, ',', '.') . '/cab',
                'at' => $a->created_at,
            ]));

        Negociacao::with(['comprador:id,nome', 'vendedor:id,nome'])->latest()->limit($limit)->get()
            ->each(fn($n) => $eventos->push([
                'tipo' => 'negociacao', 'icon' => '💬', 'user' => $n->comprador?->nome ?? '—',
                'titulo' => 'Negociação: ' . ($n->comprador?->nome ?? '?') . ' → ' . ($n->vendedor?->nome ?? '?'),
                'descricao' => 'Status: ' . $n->status,
                'at' => $n->created_at,
            ]));

        Assinatura::with(['assinante', 'plano:id,nome'])->latest()->limit($limit)->get()
            ->each(fn($a) => $eventos->push([
                'tipo' => 'assinatura', 'icon' => '⭐', 'user' => $a->assinante?->nome ?? '—',
                'titulo' => 'Assinatura ' . ($a->plano?->nome ?? '?') . ' · ' . $a->status,
                'descricao' => 'R$ ' . number_format($a->valor, 2, ',', '.'),
                'at' => $a->created_at,
            ]));

        User::latest()->limit(20)->get()
            ->each(fn($u) => $eventos->push([
                'tipo' => 'cadastro', 'icon' => '🎉', 'user' => $u->nome,
                'titulo' => 'Novo cadastro: ' . $u->nome,
                'descricao' => $u->estado ? $u->municipio . '/' . $u->estado : null,
                'at' => $u->created_at,
            ]));

        return response()->json(
            $eventos->sortByDesc('at')->take(100)->values()->map(fn($e) => [
                ...$e,
                'at' => $e['at']?->toISOString(),
            ])
        );
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
