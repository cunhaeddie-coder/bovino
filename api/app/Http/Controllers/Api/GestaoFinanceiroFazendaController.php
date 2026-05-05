<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\Custo;
use App\Models\Fazenda;
use App\Models\ReceitaFazenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoFinanceiroFazendaController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    // ── DASHBOARD FINANCEIRO ─────────────────────────────────────────────────

    public function resumo(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $mes  = $request->input('mes', now()->month);
        $ano  = $request->input('ano', now()->year);

        $receitas = ReceitaFazenda::where('fazenda_id', $fazenda->id)
            ->whereMonth('data', $mes)->whereYear('data', $ano)->sum('valor');

        $custos = Custo::whereHas('lote', fn($q) => $q->where('fazenda_id', $fazenda->id))
            ->whereMonth('data', $mes)->whereYear('data', $ano)->sum('valor');

        $contasPagarTotal = ContaPagar::where('fazenda_id', $fazenda->id)
            ->where('status', 'pendente')->sum('valor');

        $contasVencidas = ContaPagar::where('fazenda_id', $fazenda->id)
            ->where('status', 'pendente')
            ->where('vencimento', '<', today())->count();

        $contasReceberTotal = ContaReceber::where('fazenda_id', $fazenda->id)
            ->where('status', 'pendente')->sum('valor');

        $receitasPorCategoria = ReceitaFazenda::where('fazenda_id', $fazenda->id)
            ->whereMonth('data', $mes)->whereYear('data', $ano)
            ->select('categoria', DB::raw('SUM(valor) as total'))
            ->groupBy('categoria')->get();

        $fluxo12meses = ReceitaFazenda::where('fazenda_id', $fazenda->id)
            ->where('data', '>=', now()->subMonths(12)->startOfMonth())
            ->select(DB::raw("DATE_FORMAT(data,'%Y-%m') as mes"), DB::raw('SUM(valor) as receita'))
            ->groupBy('mes')->orderBy('mes')->get();

        return response()->json([
            'receitas_mes'           => $receitas,
            'custos_mes'             => $custos,
            'lucro_mes'              => $receitas - $custos,
            'contas_pagar_total'     => $contasPagarTotal,
            'contas_vencidas'        => $contasVencidas,
            'contas_receber_total'   => $contasReceberTotal,
            'receitas_por_categoria' => $receitasPorCategoria,
            'fluxo_12_meses'         => $fluxo12meses,
        ]);
    }

    // ── RECEITAS ─────────────────────────────────────────────────────────────

    public function indexReceitas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            ReceitaFazenda::where('fazenda_id', $fazenda->id)
                ->with('lote')
                ->when($request->mes, fn($q) => $q->whereMonth('data', $request->mes))
                ->when($request->ano, fn($q) => $q->whereYear('data', $request->ano))
                ->orderByDesc('data')->paginate(20)
        );
    }

    public function storeReceita(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'descricao'   => ['required','string'],
            'categoria'   => ['required','string'],
            'valor'       => ['required','numeric','min:0.01'],
            'data'        => ['required','date'],
            'lote_id'     => ['nullable','integer'],
            'observacoes' => ['nullable','string'],
        ]);
        $r = ReceitaFazenda::create(['fazenda_id' => $fazenda->id, 'user_id' => $request->user()->id] + $data);
        return response()->json($r, 201);
    }

    public function destroyReceita(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        ReceitaFazenda::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Receita removida.']);
    }

    // ── CONTAS A PAGAR ───────────────────────────────────────────────────────

    public function indexContasPagar(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            ContaPagar::where('fazenda_id', $fazenda->id)
                ->with('fornecedor')
                ->when($request->status, fn($q) => $q->where('status', $request->status))
                ->orderBy('vencimento')->paginate(20)
        );
    }

    public function storeContaPagar(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'descricao'      => ['required','string'],
            'categoria'      => ['nullable','string'],
            'fornecedor_id'  => ['nullable','integer'],
            'valor'          => ['required','numeric','min:0.01'],
            'vencimento'     => ['required','date'],
            'recorrente'     => ['boolean'],
            'observacoes'    => ['nullable','string'],
        ]);
        $c = ContaPagar::create(['fazenda_id' => $fazenda->id, 'user_id' => $request->user()->id] + $data);
        return response()->json($c, 201);
    }

    public function pagarConta(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $conta = ContaPagar::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $conta->update([
            'status'          => 'pago',
            'pago_em'         => $request->input('pago_em', today()),
            'forma_pagamento' => $request->input('forma_pagamento'),
        ]);
        return response()->json($conta);
    }

    public function destroyContaPagar(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        ContaPagar::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Conta removida.']);
    }

    // ── CONTAS A RECEBER ─────────────────────────────────────────────────────

    public function indexContasReceber(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            ContaReceber::where('fazenda_id', $fazenda->id)
                ->when($request->status, fn($q) => $q->where('status', $request->status))
                ->orderBy('vencimento')->paginate(20)
        );
    }

    public function storeContaReceber(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'descricao'        => ['required','string'],
            'cliente_nome'     => ['nullable','string'],
            'cliente_telefone' => ['nullable','string'],
            'valor'            => ['required','numeric','min:0.01'],
            'vencimento'       => ['required','date'],
            'observacoes'      => ['nullable','string'],
        ]);
        $c = ContaReceber::create(['fazenda_id' => $fazenda->id, 'user_id' => $request->user()->id] + $data);
        return response()->json($c, 201);
    }

    public function receberConta(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $conta = ContaReceber::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $conta->update(['status' => 'recebido', 'recebido_em' => $request->input('recebido_em', today())]);
        return response()->json($conta);
    }
}
