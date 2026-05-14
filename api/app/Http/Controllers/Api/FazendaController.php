<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fazenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FazendaController extends Controller
{
    private const PLANOS_FAZENDA = ['produtor-premium', 'produtor-elite'];

    private function temPlanoFazenda(Request $request): bool
    {
        $user = $request->user();
        if (in_array($user->plano, self::PLANOS_FAZENDA)) return true;

        return $user->assinaturas()
            ->where('status', 'ativa')
            ->whereHas('plano', fn($q) => $q->whereIn('slug', self::PLANOS_FAZENDA))
            ->exists();
    }

    public function show(Request $request): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        return response()->json($fazenda);
    }

    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        $fazenda = Fazenda::where('slug', $slug)->where('ativo', true)->firstOrFail();

        $avaliacoes = $fazenda->avaliacoes()
            ->with('comprador:id,nome,verificado_cpf')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($av) => [
                'id'                => $av->id,
                'nota'              => $av->nota,
                'comentario'        => $av->comentario,
                'resposta_vendedor' => $av->resposta_vendedor,
                'created_at'        => $av->created_at,
                'comprador_nome'    => $av->comprador->nome,
                'comprador_verificado' => (bool) $av->comprador->verificado_cpf,
            ]);

        $anuncios = $fazenda->user
            ->anuncios()
            ->where('exibir_na_fazenda', true)
            ->whereNull('deleted_at')
            ->with(['animal:id,raca,sexo,idade_meses,quantidade,status', 'fotos'])
            ->get(['id', 'titulo', 'preco_unitario', 'aceita_negociacao', 'views', 'created_at']);

        return response()->json([
            ...$fazenda->only([
                'id', 'slug', 'nome', 'descricao', 'estado', 'municipio',
                'area_ha', 'anos_atividade', 'racas_principais',
                'gta_numero', 'sisbov_numero', 'website', 'logo_url', 'fotos',
            ]),
            'user_id'      => $fazenda->user_id,
            'nota_media'   => $fazenda->nota_media,
            'total_vendas' => $fazenda->total_vendas,
            'avaliacoes'   => $avaliacoes,
            'anuncios'     => $anuncios,
            // whatsapp nunca exposto publicamente — use /contato
        ]);
    }

    public function contato(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();

        $temPlano = $user->plano === 'comprador-premium'
            || $user->assinaturas()
                ->where('status', 'ativa')
                ->whereHas('plano', fn($q) => $q->where('slug', 'comprador-premium'))
                ->exists();

        if (!$temPlano) {
            return response()->json([
                'message' => 'Recurso exclusivo do plano Comprador Premium.',
                'upgrade' => true,
            ], 403);
        }

        $fazenda = Fazenda::where('slug', $slug)->where('ativo', true)->firstOrFail();

        return response()->json(['whatsapp' => $fazenda->whatsapp]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$this->temPlanoFazenda($request)) {
            return response()->json([
                'message' => 'Página de fazenda disponível nos planos Produtor Premium e Elite.',
                'upgrade' => true,
            ], 403);
        }

        // Multi-fazenda: sem limite de fazendas por usuário

        $data = $request->validate([
            'nome'             => 'required|string|max:120',
            'descricao'        => 'nullable|string|max:1000',
            'estado'           => 'required|string|size:2',
            'municipio'        => 'required|string|max:120',
            'area_ha'          => 'nullable|numeric|min:0',
            'gta_numero'       => 'nullable|string|max:60',
            'sisbov_numero'    => 'nullable|string|max:60',
            'website'          => 'nullable|url',
            'whatsapp'         => 'nullable|string|max:20',
            'anos_atividade'   => 'nullable|integer|min:0',
            'racas_principais' => 'nullable|array',
            'logo_url'         => 'nullable|url',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['slug']    = Str::slug($data['nome']) . '-' . Str::random(6);
        $data['ativo']   = false; // começa despublicada — produtor publica quando quiser

        $fazenda = Fazenda::create($data);
        return response()->json($fazenda, 201);
    }

    public function update(Request $request): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 404, 'Fazenda não encontrada.');

        $data = $request->validate([
            'nome'             => 'sometimes|string|max:120',
            'descricao'        => 'nullable|string|max:1000',
            'estado'           => 'sometimes|string|size:2',
            'municipio'        => 'sometimes|string|max:120',
            'area_ha'          => 'nullable|numeric|min:0',
            'gta_numero'       => 'nullable|string|max:60',
            'sisbov_numero'    => 'nullable|string|max:60',
            'website'          => 'nullable|url',
            'whatsapp'         => 'nullable|string|max:20',
            'anos_atividade'   => 'nullable|integer|min:0',
            'racas_principais' => 'nullable|array',
            'logo_url'         => 'nullable|url',
            'fotos'            => 'nullable|array',
            'ativo'            => 'sometimes|boolean',
        ]);

        $fazenda->update($data);
        return response()->json($fazenda->fresh());
    }

    public function minhas(Request $request): JsonResponse
    {
        $fazendas = $request->user()->fazendas()
            ->select('id', 'nome', 'slug', 'municipio', 'estado', 'logo_url', 'ativo')
            ->orderBy('created_at')
            ->get();

        return response()->json($fazendas);
    }

    public function toggleAnuncio(Request $request, int $anuncioId): JsonResponse
    {
        $anuncio = $request->user()->anuncios()->findOrFail($anuncioId);
        $anuncio->update(['exibir_na_fazenda' => !$anuncio->exibir_na_fazenda]);
        return response()->json(['exibir_na_fazenda' => $anuncio->exibir_na_fazenda]);
    }
}
