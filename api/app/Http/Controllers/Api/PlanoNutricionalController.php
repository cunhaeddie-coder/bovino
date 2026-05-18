<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlanoNutricionalController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $planos = DB::table('planos_nutricionais')
            ->where('fazenda_id', $fazenda->id)
            ->orderBy('nome')
            ->get()
            ->map(function ($p) {
                $p->itens = DB::table('plano_nutricional_itens')
                    ->where('plano_id', $p->id)
                    ->get();
                return $p;
            });

        return response()->json($planos);
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'nome'                => 'required|string|max:100',
            'categoria'           => 'required|in:bezerro,novilho,novilha,boi_gordo,vaca,touro,misto',
            'custo_diario_animal' => 'nullable|numeric|min:0',
            'descricao'           => 'nullable|string|max:500',
            'itens'               => 'nullable|array',
            'itens.*.ingrediente'         => 'required|string|max:100',
            'itens.*.quantidade_por_animal' => 'required|numeric|min:0',
            'itens.*.unidade'             => 'nullable|string|max:20',
            'itens.*.custo_estimado'      => 'nullable|numeric|min:0',
        ]);

        $planoId = DB::table('planos_nutricionais')->insertGetId([
            'fazenda_id'          => $fazenda->id,
            'nome'                => $data['nome'],
            'categoria'           => $data['categoria'],
            'custo_diario_animal' => $data['custo_diario_animal'] ?? null,
            'descricao'           => $data['descricao'] ?? null,
            'ativo'               => true,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        foreach ($data['itens'] ?? [] as $item) {
            DB::table('plano_nutricional_itens')->insert([
                'plano_id'              => $planoId,
                'ingrediente'           => $item['ingrediente'],
                'quantidade_por_animal' => $item['quantidade_por_animal'],
                'unidade'               => $item['unidade'] ?? 'kg',
                'custo_estimado'        => $item['custo_estimado'] ?? null,
                'created_at'            => now(),
                'updated_at'            => now(),
            ]);
        }

        $plano = DB::table('planos_nutricionais')->find($planoId);
        $plano->itens = DB::table('plano_nutricional_itens')->where('plano_id', $planoId)->get();

        return response()->json($plano, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        abort_unless(
            DB::table('planos_nutricionais')->where('id', $id)->where('fazenda_id', $fazenda->id)->exists(),
            404
        );

        $data = $request->validate([
            'nome'                => 'sometimes|string|max:100',
            'categoria'           => 'sometimes|in:bezerro,novilho,novilha,boi_gordo,vaca,touro,misto',
            'custo_diario_animal' => 'nullable|numeric|min:0',
            'descricao'           => 'nullable|string|max:500',
            'ativo'               => 'sometimes|boolean',
            'itens'               => 'nullable|array',
            'itens.*.ingrediente'           => 'required|string|max:100',
            'itens.*.quantidade_por_animal' => 'required|numeric|min:0',
            'itens.*.unidade'               => 'nullable|string|max:20',
            'itens.*.custo_estimado'        => 'nullable|numeric|min:0',
        ]);

        DB::table('planos_nutricionais')->where('id', $id)->update(array_merge(
            array_intersect_key($data, array_flip(['nome','categoria','custo_diario_animal','descricao','ativo'])),
            ['updated_at' => now()]
        ));

        if (isset($data['itens'])) {
            DB::table('plano_nutricional_itens')->where('plano_id', $id)->delete();
            foreach ($data['itens'] as $item) {
                DB::table('plano_nutricional_itens')->insert([
                    'plano_id'              => $id,
                    'ingrediente'           => $item['ingrediente'],
                    'quantidade_por_animal' => $item['quantidade_por_animal'],
                    'unidade'               => $item['unidade'] ?? 'kg',
                    'custo_estimado'        => $item['custo_estimado'] ?? null,
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);
            }
        }

        $plano = DB::table('planos_nutricionais')->find($id);
        $plano->itens = DB::table('plano_nutricional_itens')->where('plano_id', $id)->get();
        return response()->json($plano);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $deleted = DB::table('planos_nutricionais')
            ->where('id', $id)->where('fazenda_id', $fazenda->id)->delete();
        abort_if(!$deleted, 404);
        return response()->json(null, 204);
    }
}
