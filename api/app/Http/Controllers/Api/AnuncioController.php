<?php

namespace App\Http\Controllers\Api;

use App\Events\NovoAnuncio;
use App\Http\Controllers\Controller;
use App\Models\Anuncio;
use App\Models\Animal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnuncioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Anuncio::with(['animal', 'fotos', 'user:id,nome,estado,municipio,verificado_cpf,plano'])
            ->addSelect([
                'is_elite' => \DB::table('assinaturas')
                    ->join('planos', 'planos.id', '=', 'assinaturas.plano_id')
                    ->whereColumn('assinaturas.user_id', 'anuncios.user_id')
                    ->where('assinaturas.status', 'ativa')
                    ->whereRaw("(LOWER(planos.slug) LIKE '%elite%' OR LOWER(planos.nome) LIKE '%elite%')")
                    ->selectRaw('1')
                    ->limit(1),
            ])
            ->where(function ($q) {
                $q->whereNull('anuncios.expira_em')
                  ->orWhere('anuncios.expira_em', '>', now());
            });

        if ($request->filled('raca')) {
            $query->whereHas('animal', fn($q) => $q->where('raca', 'like', '%' . $request->raca . '%'));
        }
        if ($request->filled('estado')) {
            $query->whereHas('animal', fn($q) => $q->where('estado', $request->estado));
        }
        if ($request->filled('municipio')) {
            $query->whereHas('animal', fn($q) => $q->where('municipio', 'like', '%' . $request->municipio . '%'));
        }
        if ($request->filled('sexo')) {
            $query->whereHas('animal', fn($q) => $q->where('sexo', $request->sexo));
        }
        if ($request->filled('preco_min')) {
            $query->where('preco_unitario', '>=', $request->preco_min);
        }
        if ($request->filled('preco_max')) {
            $query->where('preco_unitario', '<=', $request->preco_max);
        }

        // Elite → 1, qualquer assinatura ativa → 2, free → 3
        $query->orderByRaw("
            CASE
                WHEN (SELECT 1 FROM assinaturas
                        JOIN planos ON planos.id = assinaturas.plano_id
                       WHERE assinaturas.user_id = anuncios.user_id
                         AND assinaturas.status = 'ativa'
                         AND (LOWER(planos.slug) LIKE '%elite%' OR LOWER(planos.nome) LIKE '%elite%')
                       LIMIT 1) = 1 THEN 1
                WHEN (SELECT 1 FROM assinaturas
                       WHERE assinaturas.user_id = anuncios.user_id
                         AND assinaturas.status = 'ativa'
                       LIMIT 1) = 1 THEN 2
                ELSE 3
            END ASC
        ")
        ->orderByDesc('anuncios.destaque')
        ->orderByDesc('anuncios.created_at');

        return response()->json($query->paginate(20));
    }

    public function show(Anuncio $anuncio): JsonResponse
    {
        $anuncio->increment('views');

        $anuncio->load(['animal', 'midias', 'user:id,nome,estado,municipio,verificado_cpf,verificado_celular']);

        return response()->json($anuncio);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'animal_id' => ['nullable', 'exists:animais,id'],
            'raca' => ['required_without:animal_id', 'string'],
            'sexo' => ['required_without:animal_id', 'in:macho,femea,misto'],
            'idade_meses' => ['nullable', 'integer', 'min:1'],
            'peso_estimado' => ['nullable', 'numeric', 'min:0'],
            'quantidade' => ['required', 'integer', 'min:1'],
            'estado' => ['required', 'string', 'size:2'],
            'municipio' => ['required', 'string', 'max:255'],
            'propriedade' => ['nullable', 'string', 'max:255'],
            'titulo' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'preco_unitario' => ['required', 'numeric', 'min:0'],
            'aceita_negociacao' => ['boolean'],
            'expira_em' => ['nullable', 'date', 'after:today'],
        ]);

        if (empty($data['animal_id'])) {
            $animal = Animal::create([
                'user_id' => $request->user()->id,
                'raca' => $data['raca'],
                'sexo' => $data['sexo'],
                'idade_meses' => $data['idade_meses'] ?? null,
                'peso_estimado' => $data['peso_estimado'] ?? null,
                'quantidade' => $data['quantidade'],
                'estado' => $data['estado'],
                'municipio' => $data['municipio'],
                'propriedade' => $data['propriedade'] ?? null,
            ]);
            $data['animal_id'] = $animal->id;
        }

        $anuncio = Anuncio::create([
            'user_id'           => $request->user()->id,
            'animal_id'         => $data['animal_id'],
            'titulo'            => $data['titulo'],
            'descricao'         => $data['descricao'] ?? null,
            'preco_unitario'    => $data['preco_unitario'],
            'aceita_negociacao' => $data['aceita_negociacao'] ?? true,
            'expira_em'         => $data['expira_em'] ?? null,
        ]);

        NovoAnuncio::dispatch($anuncio);

        return response()->json($anuncio->load('animal'), 201);
    }

    public function update(Request $request, Anuncio $anuncio): JsonResponse
    {
        if ($anuncio->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate([
            'titulo'            => ['sometimes', 'string', 'max:255'],
            'descricao'         => ['nullable', 'string'],
            'preco_unitario'    => ['sometimes', 'numeric', 'min:0'],
            'aceita_negociacao' => ['boolean'],
            'expira_em'         => ['nullable', 'date', 'after:today'],
            'raca'              => ['sometimes', 'string'],
            'sexo'              => ['sometimes', 'in:macho,femea,misto'],
            'quantidade'        => ['sometimes', 'integer', 'min:1'],
            'idade_meses'       => ['nullable', 'integer', 'min:1'],
            'peso_estimado'     => ['nullable', 'numeric', 'min:0'],
            'estado'            => ['sometimes', 'string', 'size:2'],
            'municipio'         => ['sometimes', 'string', 'max:255'],
            'propriedade'       => ['nullable', 'string', 'max:255'],
        ]);

        $anuncioFields = array_intersect_key($data, array_flip([
            'titulo', 'descricao', 'preco_unitario', 'aceita_negociacao', 'expira_em',
        ]));
        $animalFields = array_intersect_key($data, array_flip([
            'raca', 'sexo', 'quantidade', 'idade_meses', 'peso_estimado',
            'estado', 'municipio', 'propriedade',
        ]));

        if ($anuncioFields) $anuncio->update($anuncioFields);
        if ($animalFields && $anuncio->animal) $anuncio->animal->update($animalFields);

        return response()->json($anuncio->fresh()->load(['animal', 'midias']));
    }

    public function destroy(Request $request, Anuncio $anuncio): JsonResponse
    {
        if ($anuncio->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $anuncio->delete();

        return response()->json(['message' => 'Anúncio removido.']);
    }

    public function meus(Request $request): JsonResponse
    {
        $anuncios = Anuncio::with(['animal', 'fotos'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($anuncios);
    }
}
