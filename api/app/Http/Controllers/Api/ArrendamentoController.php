<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Arrendamento;
use App\Models\ContaPagar;
use App\Models\ContaReceber;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArrendamentoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        if (!$fazenda) return response()->json(['message' => 'Fazenda não encontrada.'], 403);

        $todos = Arrendamento::where('fazenda_id', $fazenda->id)
            ->orderByRaw("FIELD(status, 'ativo', 'suspenso', 'encerrado')")
            ->orderBy('data_fim')
            ->get();

        $tomadores = $todos->where('tipo', 'tomador')->values();
        $cedentes  = $todos->where('tipo', 'cedente')->values();

        return response()->json([
            'tomador' => $tomadores,
            'cedente' => $cedentes,
            'resumo'  => [
                'total_pagar_mes'   => $tomadores->where('status', 'ativo')->sum('valor_mensal'),
                'total_receber_mes' => $cedentes->where('status', 'ativo')->sum('valor_mensal'),
                'area_ocupada'      => $tomadores->where('status', 'ativo')->sum('area_hectares'),
                'area_cedida'       => $cedentes->where('status', 'ativo')->sum('area_hectares'),
                'vencendo_30dias'   => $todos->filter(fn($a) => $a->vencendoEm(30))->count(),
                'vencidos'          => $todos->filter(fn($a) => $a->vencido())->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo'              => ['required', 'in:tomador,cedente'],
            'nome_propriedade'  => ['required', 'string', 'max:255'],
            'contraparte_nome'  => ['required', 'string', 'max:255'],
            'contato'           => ['nullable', 'string', 'max:100'],
            'estado'            => ['nullable', 'string', 'size:2'],
            'municipio'         => ['nullable', 'string', 'max:100'],
            'area_hectares'     => ['nullable', 'numeric', 'min:0'],
            'valor_mensal'      => ['required', 'numeric', 'min:0'],
            'tipo_pagamento'    => ['required', 'in:mensal,semestral,anual,por_cabeca'],
            'dia_vencimento'    => ['required', 'integer', 'min:1', 'max:28'],
            'data_inicio'       => ['required', 'date'],
            'data_fim'          => ['nullable', 'date', 'after:data_inicio'],
            'status'            => ['required', 'in:ativo,encerrado,suspenso'],
            'observacoes'       => ['nullable', 'string'],
            'gerar_parcelas'    => ['nullable', 'integer', 'min:1', 'max:24'],
        ]);

        $fazenda = $request->user()->fazenda;
        if (!$fazenda) return response()->json(['message' => 'Fazenda não encontrada.'], 403);

        $arrendamento = Arrendamento::create([
            ...$data,
            'fazenda_id' => $fazenda->id,
        ]);

        if ($data['status'] === 'ativo' && !empty($data['gerar_parcelas'])) {
            $this->gerarParcelas($arrendamento, $fazenda->id, (int) $data['gerar_parcelas']);
        }

        return response()->json($arrendamento, 201);
    }

    public function update(Request $request, Arrendamento $arrendamento): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        if (!$fazenda || $arrendamento->fazenda_id !== $fazenda->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate([
            'tipo'              => ['sometimes', 'in:tomador,cedente'],
            'nome_propriedade'  => ['sometimes', 'string', 'max:255'],
            'contraparte_nome'  => ['sometimes', 'string', 'max:255'],
            'contato'           => ['nullable', 'string', 'max:100'],
            'estado'            => ['nullable', 'string', 'size:2'],
            'municipio'         => ['nullable', 'string', 'max:100'],
            'area_hectares'     => ['nullable', 'numeric', 'min:0'],
            'valor_mensal'      => ['sometimes', 'numeric', 'min:0'],
            'tipo_pagamento'    => ['sometimes', 'in:mensal,semestral,anual,por_cabeca'],
            'dia_vencimento'    => ['sometimes', 'integer', 'min:1', 'max:28'],
            'data_inicio'       => ['sometimes', 'date'],
            'data_fim'          => ['nullable', 'date'],
            'status'            => ['sometimes', 'in:ativo,encerrado,suspenso'],
            'observacoes'       => ['nullable', 'string'],
        ]);

        $arrendamento->update($data);
        return response()->json($arrendamento);
    }

    public function destroy(Request $request, Arrendamento $arrendamento): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        if (!$fazenda || $arrendamento->fazenda_id !== $fazenda->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $arrendamento->delete();
        return response()->json(['message' => 'Arrendamento removido.']);
    }

    private function gerarParcelas(Arrendamento $arrendamento, int $fazendaId, int $meses): void
    {
        $inicio    = Carbon::parse($arrendamento->data_inicio);
        $descricao = "Arrendamento — {$arrendamento->nome_propriedade}";

        for ($i = 0; $i < $meses; $i++) {
            $vencimento = $inicio->copy()->addMonths($i)->setDay($arrendamento->dia_vencimento);

            if ($arrendamento->tipo === 'tomador') {
                ContaPagar::create([
                    'fazenda_id'  => $fazendaId,
                    'descricao'   => $descricao,
                    'categoria'   => 'arrendamento',
                    'valor'       => $arrendamento->valor_mensal,
                    'vencimento'  => $vencimento->toDateString(),
                    'status'      => 'pendente',
                    'observacoes' => "Parcela " . ($i + 1) . " de {$meses} — {$arrendamento->contraparte_nome}",
                ]);
            } else {
                ContaReceber::create([
                    'fazenda_id'  => $fazendaId,
                    'descricao'   => $descricao,
                    'cliente_nome' => $arrendamento->contraparte_nome,
                    'valor'       => $arrendamento->valor_mensal,
                    'vencimento'  => $vencimento->toDateString(),
                    'status'      => 'pendente',
                    'observacoes' => "Parcela " . ($i + 1) . " de {$meses}",
                ]);
            }
        }
    }
}
