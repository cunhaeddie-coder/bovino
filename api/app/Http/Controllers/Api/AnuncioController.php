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
        $query = Anuncio::with(['animal', 'fotos', 'user:id,nome,estado,municipio'])
            ->where(function ($q) {
                $q->whereNull('expira_em')
                  ->orWhere('expira_em', '>', now());
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

        $query->orderByDesc('destaque')->orderByDesc('created_at');

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
            'titulo' => ['sometimes', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'preco_unitario' => ['sometimes', 'numeric', 'min:0'],
            'aceita_negociacao' => ['boolean'],
            'expira_em' => ['nullable', 'date', 'after:today'],
        ]);

        $anuncio->update($data);

        return response()->json($anuncio->load('animal'));
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
