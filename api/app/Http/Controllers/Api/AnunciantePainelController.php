<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anunciante;
use App\Models\Banner;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AnunciantePainelController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    public function cadastro(Request $request): JsonResponse
    {
        $data = $request->validate([
            'empresa'     => ['required', 'string', 'max:255'],
            'cnpj'        => ['required', 'string', 'size:14', 'unique:anunciantes,cnpj'],
            'responsavel' => ['required', 'string', 'max:255'],
            'celular'     => ['required', 'string', 'max:20'],
            'email'       => ['required', 'email', 'unique:anunciantes,email'],
            'password'    => ['required', 'confirmed', Password::min(8)],
            'site'        => ['nullable', 'url', 'max:255'],
            'estado'      => ['nullable', 'string', 'size:2'],
            'descricao'   => ['nullable', 'string', 'max:1000'],
        ]);

        $data['password'] = Hash::make($data['password']);

        $anunciante = Anunciante::create($data);

        $token = $anunciante->createToken('anunciante-token')->plainTextToken;

        return response()->json([
            'anunciante' => $anunciante,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $anunciante = Anunciante::where('email', $data['email'])->first();

        if (!$anunciante || !Hash::check($data['password'], $anunciante->password)) {
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        if (!$anunciante->ativo) {
            return response()->json(['message' => 'Conta suspensa. Entre em contato com o suporte.'], 403);
        }

        $anunciante->tokens()->delete();
        $token = $anunciante->createToken('anunciante-token')->plainTextToken;

        return response()->json([
            'anunciante' => $anunciante->load('assinaturaAtiva.plano'),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->load(['assinaturaAtiva.plano', 'banners'])
        );
    }

    public function atualizarPerfil(Request $request): JsonResponse
    {
        $anunciante = $request->user();

        $data = $request->validate([
            'empresa'     => ['sometimes', 'string', 'max:255'],
            'responsavel' => ['sometimes', 'string', 'max:255'],
            'celular'     => ['sometimes', 'string', 'max:20'],
            'site'        => ['nullable', 'url', 'max:255'],
            'estado'      => ['nullable', 'string', 'size:2'],
            'descricao'   => ['nullable', 'string', 'max:1000'],
            'logo_url'    => ['nullable', 'url', 'max:500'],
        ]);

        $anunciante->update($data);

        return response()->json($anunciante->fresh());
    }

    public function banners(Request $request): JsonResponse
    {
        $banners = $request->user()
            ->banners()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($banners);
    }

    public function criarBanner(Request $request): JsonResponse
    {
        $anunciante = $request->user();

        $assinatura = $anunciante->assinaturaAtiva();
        if (!$assinatura) {
            return response()->json(['message' => 'É necessário ter um plano ativo para publicar banners.'], 403);
        }

        $data = $request->validate([
            'titulo'    => ['required', 'string', 'max:255'],
            'imagem_url'=> ['required', 'url', 'max:500'],
            'link_url'  => ['required', 'url', 'max:500'],
            'posicao'   => ['required', 'in:home,feed,busca'],
            'estado'    => ['nullable', 'string', 'size:2'],
            'inicia_em' => ['nullable', 'date'],
            'expira_em' => ['nullable', 'date', 'after:inicia_em'],
        ]);

        $data['anunciante_id'] = $anunciante->id;
        $data['ativo'] = true;

        $banner = Banner::create($data);

        return response()->json($banner, 201);
    }

    public function atualizarBanner(Request $request, Banner $banner): JsonResponse
    {
        if ($banner->anunciante_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate([
            'titulo'    => ['sometimes', 'string', 'max:255'],
            'imagem_url'=> ['sometimes', 'url', 'max:500'],
            'link_url'  => ['sometimes', 'url', 'max:500'],
            'posicao'   => ['sometimes', 'in:home,feed,busca'],
            'estado'    => ['nullable', 'string', 'size:2'],
            'inicia_em' => ['nullable', 'date'],
            'expira_em' => ['nullable', 'date'],
            'ativo'     => ['sometimes', 'boolean'],
        ]);

        $banner->update($data);

        return response()->json($banner->fresh());
    }

    public function excluirBanner(Request $request, Banner $banner): JsonResponse
    {
        if ($banner->anunciante_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $banner->delete();

        return response()->json(['message' => 'Banner removido.']);
    }

    public function estatisticas(Request $request): JsonResponse
    {
        $anunciante = $request->user();

        $banners = $anunciante->banners()->get();

        $stats = [
            'total_banners'    => $banners->count(),
            'banners_ativos'   => $banners->where('ativo', true)->count(),
            'total_impressoes' => $banners->sum('impressoes'),
            'total_cliques'    => $banners->sum('cliques'),
            'ctr'              => $banners->sum('impressoes') > 0
                ? round($banners->sum('cliques') / $banners->sum('impressoes') * 100, 2)
                : 0,
            'por_banner'       => $banners->map(fn($b) => [
                'id'         => $b->id,
                'titulo'     => $b->titulo,
                'posicao'    => $b->posicao,
                'impressoes' => $b->impressoes,
                'cliques'    => $b->cliques,
                'ctr'        => $b->impressoes > 0
                    ? round($b->cliques / $b->impressoes * 100, 2)
                    : 0,
            ]),
        ];

        return response()->json($stats);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logout realizado.']);
    }
}
