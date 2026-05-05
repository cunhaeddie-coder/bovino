<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Anunciante;
use App\Models\Plano;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminAnuncianteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Anunciante::with(['assinaturaAtiva.plano'])
            ->withCount('banners');

        if ($request->filled('busca')) {
            $b = $request->busca;
            $query->where(fn($q) => $q
                ->where('empresa', 'like', "%{$b}%")
                ->orWhere('email', 'like', "%{$b}%")
                ->orWhere('cnpj', 'like', "%{$b}%")
            );
        }

        if ($request->filled('status')) {
            $query->where('ativo', $request->status === 'ativo');
        }

        $anunciantes = $query->orderByDesc('created_at')->paginate(25);

        return response()->json($anunciantes);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'empresa'     => ['required', 'string', 'max:255'],
            'cnpj'        => ['required', 'string', 'size:14', 'unique:anunciantes,cnpj'],
            'responsavel' => ['required', 'string', 'max:255'],
            'celular'     => ['required', 'string', 'max:20'],
            'email'       => ['required', 'email', 'unique:anunciantes,email'],
            'site'        => ['nullable', 'url'],
            'estado'      => ['nullable', 'string', 'size:2'],
            'descricao'   => ['nullable', 'string'],
            'plano_slug'  => ['nullable', 'exists:planos,slug'],
        ]);

        // Gera senha temporária
        $senhaTemp = Str::random(10);
        $data['password'] = Hash::make($senhaTemp);
        $data['ativo'] = true;

        $anunciante = Anunciante::create($data);

        // Se informado plano, cria assinatura ativa direto (pagamento manual/comercial)
        if (!empty($data['plano_slug'])) {
            $plano = Plano::where('slug', $data['plano_slug'])->first();
            if ($plano) {
                $anunciante->assinaturas()->create([
                    'assinante_type' => get_class($anunciante),
                    'assinante_id'   => $anunciante->id,
                    'plano_id'       => $plano->id,
                    'status'         => 'ativa',
                    'valor'          => $plano->preco,
                    'inicia_em'      => now(),
                    'expira_em'      => now()->addMonth(),
                ]);
            }
        }

        return response()->json([
            'anunciante' => $anunciante,
            'senha_temp' => $senhaTemp,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $anunciante = Anunciante::with(['assinaturas.plano', 'banners'])
            ->withCount('banners')
            ->findOrFail($id);

        return response()->json($anunciante);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $anunciante = Anunciante::findOrFail($id);

        $data = $request->validate([
            'empresa'     => ['sometimes', 'string'],
            'responsavel' => ['sometimes', 'string'],
            'celular'     => ['sometimes', 'string'],
            'site'        => ['nullable', 'url'],
            'estado'      => ['nullable', 'string', 'size:2'],
            'descricao'   => ['nullable', 'string'],
            'ativo'       => ['sometimes', 'boolean'],
        ]);

        $anunciante->update($data);

        return response()->json($anunciante->fresh());
    }

    public function suspender(int $id): JsonResponse
    {
        $anunciante = Anunciante::findOrFail($id);
        $anunciante->update(['ativo' => false]);

        return response()->json(['message' => 'Anunciante suspenso.']);
    }

    public function reativar(int $id): JsonResponse
    {
        $anunciante = Anunciante::findOrFail($id);
        $anunciante->update(['ativo' => true]);

        return response()->json(['message' => 'Anunciante reativado.']);
    }

    public function resetarSenha(int $id): JsonResponse
    {
        $anunciante = Anunciante::findOrFail($id);
        $senhaTemp  = Str::random(10);
        $anunciante->update(['password' => Hash::make($senhaTemp)]);

        return response()->json(['senha_temp' => $senhaTemp]);
    }
}
