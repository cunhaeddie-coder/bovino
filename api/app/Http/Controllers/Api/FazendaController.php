<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fazenda;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FazendaController extends Controller
{
    public function show(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        return response()->json($fazenda);
    }

    public function showBySlug(string $slug)
    {
        $fazenda = Fazenda::where('slug', $slug)->where('ativo', true)->firstOrFail();

        return response()->json([
            ...$fazenda->toArray(),
            'nota_media'   => $fazenda->nota_media,
            'total_vendas' => $fazenda->total_vendas,
            'avaliacoes'   => $fazenda->avaliacoes()
                ->with('comprador:id,nome')
                ->latest()
                ->take(10)
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nome'           => 'required|string|max:120',
            'descricao'      => 'nullable|string|max:1000',
            'estado'         => 'required|string|size:2',
            'municipio'      => 'required|string|max:120',
            'area_ha'        => 'nullable|numeric|min:0',
            'gta_numero'     => 'nullable|string|max:60',
            'sisbov_numero'  => 'nullable|string|max:60',
            'website'        => 'nullable|url',
            'whatsapp'       => 'nullable|string|max:20',
            'anos_atividade' => 'nullable|integer|min:0',
            'racas_principais' => 'nullable|array',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['slug'] = Str::slug($data['nome']) . '-' . Str::random(6);

        $fazenda = Fazenda::create($data);
        return response()->json($fazenda, 201);
    }

    public function update(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 404, 'Fazenda não encontrada');

        $data = $request->validate([
            'nome'           => 'sometimes|string|max:120',
            'descricao'      => 'nullable|string|max:1000',
            'estado'         => 'sometimes|string|size:2',
            'municipio'      => 'sometimes|string|max:120',
            'area_ha'        => 'nullable|numeric|min:0',
            'gta_numero'     => 'nullable|string|max:60',
            'sisbov_numero'  => 'nullable|string|max:60',
            'website'        => 'nullable|url',
            'whatsapp'       => 'nullable|string|max:20',
            'anos_atividade' => 'nullable|integer|min:0',
            'racas_principais' => 'nullable|array',
            'logo_url'       => 'nullable|url',
            'fotos'          => 'nullable|array',
        ]);

        $fazenda->update($data);
        return response()->json($fazenda->fresh());
    }
}
