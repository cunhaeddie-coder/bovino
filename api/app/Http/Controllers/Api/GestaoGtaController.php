<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoGtaController extends Controller
{
    private function fazendaId(Request $request): int
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda->id;
    }

    public function resumo(Request $request): JsonResponse
    {
        $fid = $this->fazendaId($request);

        $counts = Gta::where('fazenda_id', $fid)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'emitida'     THEN 1 ELSE 0 END) as emitidas,
                SUM(CASE WHEN status = 'em_transito' THEN 1 ELSE 0 END) as em_transito,
                SUM(CASE WHEN status = 'concluida'   THEN 1 ELSE 0 END) as concluidas,
                SUM(CASE WHEN tipo = 'saida'         THEN 1 ELSE 0 END) as saidas,
                SUM(CASE WHEN tipo = 'entrada'       THEN 1 ELSE 0 END) as entradas,
                SUM(qtd_animais) as total_animais
            ")
            ->first();

        $vencendo = Gta::where('fazenda_id', $fid)
            ->whereIn('status', ['emitida', 'em_transito'])
            ->whereNotNull('data_validade')
            ->where('data_validade', '<=', now()->addDays(3))
            ->where('data_validade', '>=', today())
            ->count();

        return response()->json([
            'total'          => (int) ($counts->total ?? 0),
            'emitidas'       => (int) ($counts->emitidas ?? 0),
            'em_transito'    => (int) ($counts->em_transito ?? 0),
            'concluidas'     => (int) ($counts->concluidas ?? 0),
            'saidas'         => (int) ($counts->saidas ?? 0),
            'entradas'       => (int) ($counts->entradas ?? 0),
            'total_animais'  => (int) ($counts->total_animais ?? 0),
            'vencendo_hoje'  => (int) $vencendo,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $fid = $this->fazendaId($request);

        $q = Gta::where('fazenda_id', $fid)->orderByDesc('data_emissao')->orderByDesc('id');

        if ($request->filled('tipo'))       $q->where('tipo', $request->tipo);
        if ($request->filled('status'))     $q->where('status', $request->status);
        if ($request->filled('finalidade')) $q->where('finalidade', $request->finalidade);

        return response()->json($q->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $fid = $this->fazendaId($request);

        $data = $request->validate([
            'numero_gta'       => ['nullable', 'string', 'max:60'],
            'tipo'             => ['required', 'in:entrada,saida'],
            'finalidade'       => ['required', 'in:venda,abate,reproducao,exposicao,pastagem,retorno,outros'],
            'origem_nome'      => ['nullable', 'string', 'max:120'],
            'origem_municipio' => ['nullable', 'string', 'max:120'],
            'origem_estado'    => ['nullable', 'string', 'max:2'],
            'destino_nome'     => ['nullable', 'string', 'max:120'],
            'destino_municipio'=> ['nullable', 'string', 'max:120'],
            'destino_estado'   => ['nullable', 'string', 'max:2'],
            'data_emissao'     => ['required', 'date'],
            'data_validade'    => ['nullable', 'date', 'after_or_equal:data_emissao'],
            'qtd_animais'      => ['required', 'integer', 'min:1'],
            'especie'          => ['nullable', 'string', 'max:40'],
            'categorias'       => ['nullable', 'string', 'max:200'],
            'observacoes'      => ['nullable', 'string', 'max:1000'],
        ]);

        $gta = Gta::create(array_merge($data, [
            'fazenda_id' => $fid,
            'user_id'    => $request->user()->id,
            'status'     => 'emitida',
        ]));

        return response()->json($gta, 201);
    }

    public function atualizarStatus(Request $request, int $id): JsonResponse
    {
        $fid = $this->fazendaId($request);
        $gta = Gta::where('fazenda_id', $fid)->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:emitida,em_transito,concluida,cancelada'],
        ]);

        $gta->update($data);

        return response()->json($gta);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fid = $this->fazendaId($request);
        Gta::where('fazenda_id', $fid)->findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
