<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestao\StoreCompraInsumoRequest;
use App\Models\CompraInsumo;
use App\Models\CompraItem;
use App\Models\EstoqueInsumo;
use App\Models\Fazenda;
use App\Models\Insumo;
use App\Models\MovimentacaoEstoque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoInsumoController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    // ── INSUMOS ─────────────────────────────────────────────────────────────

    public function indexInsumos(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $insumos = Insumo::where('fazenda_id', $fazenda->id)
            ->with(['estoque','fornecedor'])
            ->when($request->categoria, fn($q) => $q->where('categoria', $request->categoria))
            ->when($request->busca,     fn($q) => $q->where('nome', 'like', "%{$request->busca}%"))
            ->orderBy('nome')->get();

        return response()->json($insumos);
    }

    public function storeInsumo(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'nome'                => ['required','string'],
            'codigo'              => ['nullable','string'],
            'categoria'           => ['required','string'],
            'unidade'             => ['required','string'],
            'preco_unitario'      => ['nullable','numeric'],
            'fornecedor_padrao_id'=> ['nullable','integer'],
            'descricao'           => ['nullable','string'],
        ]);

        $insumo = Insumo::create(['fazenda_id' => $fazenda->id] + $data);

        EstoqueInsumo::create([
            'insumo_id'         => $insumo->id,
            'fazenda_id'        => $fazenda->id,
            'quantidade_atual'  => 0,
            'quantidade_minima' => $request->input('quantidade_minima', 0),
        ]);

        return response()->json($insumo->load(['estoque','fornecedor']), 201);
    }

    public function updateInsumo(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $insumo = Insumo::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $insumo->update($request->except(['fazenda_id']));
        return response()->json($insumo->load(['estoque','fornecedor']));
    }

    // ── COMPRAS ─────────────────────────────────────────────────────────────

    public function indexCompras(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $compras = CompraInsumo::where('fazenda_id', $fazenda->id)
            ->with(['fornecedor','itens.insumo'])
            ->orderByDesc('data_compra')
            ->paginate(20);
        return response()->json($compras);
    }

    public function storeCompra(StoreCompraInsumoRequest $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data    = $request->validated();

        DB::transaction(function () use ($fazenda, $data, $request) {
            $total = collect($data['itens'])->sum(fn($i) => $i['quantidade'] * $i['valor_unitario']);

            $compra = CompraInsumo::create([
                'fazenda_id'      => $fazenda->id,
                'fornecedor_id'   => $data['fornecedor_id'] ?? null,
                'data_compra'     => $data['data_compra'],
                'valor_total'     => $total,
                'status'          => 'confirmada',
                'nota_fiscal'     => $data['nota_fiscal'] ?? null,
                'forma_pagamento' => $data['forma_pagamento'] ?? null,
                'data_vencimento' => $data['data_vencimento'] ?? null,
                'observacoes'     => $data['observacoes'] ?? null,
                'user_id'         => $request->user()->id,
            ]);

            foreach ($data['itens'] as $item) {
                CompraItem::create([
                    'compra_id'      => $compra->id,
                    'insumo_id'      => $item['insumo_id'],
                    'quantidade'     => $item['quantidade'],
                    'valor_unitario' => $item['valor_unitario'],
                ]);

                $estoque = EstoqueInsumo::firstOrCreate(
                    ['insumo_id' => $item['insumo_id'], 'fazenda_id' => $fazenda->id],
                    ['quantidade_atual' => 0, 'quantidade_minima' => 0]
                );
                $estoque->increment('quantidade_atual', $item['quantidade']);

                MovimentacaoEstoque::create([
                    'insumo_id'      => $item['insumo_id'],
                    'fazenda_id'     => $fazenda->id,
                    'tipo'           => 'entrada',
                    'quantidade'     => $item['quantidade'],
                    'custo_unitario' => $item['valor_unitario'],
                    'motivo'         => "Compra #{$compra->id}",
                    'compra_id'      => $compra->id,
                    'user_id'        => $request->user()->id,
                    'created_at'     => now(),
                ]);
            }
        });

        return response()->json(['message' => 'Compra registrada com sucesso.'], 201);
    }

    // ── MOVIMENTAÇÕES MANUAIS ────────────────────────────────────────────────

    public function movimentar(Request $request, int $insumoId): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $insumo  = Insumo::where('fazenda_id', $fazenda->id)->findOrFail($insumoId);
        $data = $request->validate([
            'tipo'           => ['required','in:saida,ajuste,perda'],
            'quantidade'     => ['required','numeric','min:0.001'],
            'motivo'         => ['nullable','string'],
            'custo_unitario' => ['nullable','numeric'],
        ]);

        $estoque = EstoqueInsumo::withoutGlobalScope('fazenda')
            ->where('insumo_id', $insumo->id)
            ->where('fazenda_id', $fazenda->id)
            ->firstOrFail();

        if ($data['tipo'] === 'saida' || $data['tipo'] === 'perda') {
            $estoque->decrement('quantidade_atual', $data['quantidade']);
        } else {
            $estoque->update(['quantidade_atual' => $data['quantidade']]);
        }

        MovimentacaoEstoque::create([
            'insumo_id'      => $insumo->id,
            'fazenda_id'     => $fazenda->id,
            'tipo'           => $data['tipo'],
            'quantidade'     => $data['quantidade'],
            'custo_unitario' => $data['custo_unitario'] ?? null,
            'motivo'         => $data['motivo'] ?? null,
            'user_id'        => $request->user()->id,
            'created_at'     => now(),
        ]);

        return response()->json(['message' => 'Movimentação registrada.', 'estoque' => $estoque->fresh()]);
    }

    public function resumoEstoque(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $abaixoMinimo = EstoqueInsumo::where('fazenda_id', $fazenda->id)
            ->whereColumn('quantidade_atual', '<=', 'quantidade_minima')
            ->where('quantidade_minima', '>', 0)
            ->count();

        $valorEstoque = EstoqueInsumo::where('estoque_insumos.fazenda_id', $fazenda->id)
            ->join('insumos', 'insumos.id', '=', 'estoque_insumos.insumo_id')
            ->selectRaw('SUM(estoque_insumos.quantidade_atual * COALESCE(insumos.preco_unitario, 0)) as total')
            ->value('total') ?? 0;

        $totalComprasMes = CompraInsumo::where('fazenda_id', $fazenda->id)
            ->whereMonth('data_compra', now()->month)
            ->whereYear('data_compra', now()->year)
            ->sum('valor_total');

        return response()->json([
            'abaixo_minimo'   => $abaixoMinimo,
            'valor_estoque'   => round($valorEstoque, 2),
            'compras_mes'     => $totalComprasMes,
        ]);
    }
}
