<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anuncio;
use App\Models\BuscaLog;
use App\Models\Transacao;
use Illuminate\Http\Request;

class IntelligenciaController extends Controller
{
    // Registra uma busca para alimentar o mapa de demanda
    public function logBusca(Request $request)
    {
        $data = $request->validate([
            'raca'      => 'nullable|string|max:60',
            'estado'    => 'nullable|string|size:2',
            'municipio' => 'nullable|string|max:120',
            'categoria' => 'nullable|string|max:60',
            'sexo'      => 'nullable|string|max:10',
            'peso_min'  => 'nullable|numeric',
            'peso_max'  => 'nullable|numeric',
            'preco_min' => 'nullable|numeric',
            'preco_max' => 'nullable|numeric',
        ]);

        $data['user_id'] = $request->user()?->id;
        $data['ip']      = $request->ip();

        BuscaLog::create($data);
        return response()->json(null, 204);
    }

    // Cotação média paga por raça/estado (últimos 30 dias)
    public function cotacoesRealizadas(Request $request)
    {
        $dados = Transacao::where('confirmada_comprador', true)
            ->where('confirmada_vendedor', true)
            ->where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('valor_por_arroba')
            ->when($request->raca, fn($q) => $q->where('raca', $request->raca))
            ->when($request->estado, fn($q) => $q->where('estado', $request->estado))
            ->selectRaw('raca, estado, AVG(valor_por_arroba) as media_arroba, COUNT(*) as negociacoes, SUM(qtd_cabecas) as cabecas')
            ->groupBy('raca', 'estado')
            ->orderByDesc('negociacoes')
            ->get();

        return response()->json($dados);
    }

    // Demanda por raça/estado (buscas dos últimos 30 dias)
    public function demandaRegioes(Request $request)
    {
        $dados = BuscaLog::where('created_at', '>=', now()->subDays(30))
            ->when($request->raca, fn($q) => $q->where('raca', $request->raca))
            ->selectRaw('estado, raca, COUNT(*) as buscas')
            ->whereNotNull('estado')
            ->groupBy('estado', 'raca')
            ->orderByDesc('buscas')
            ->limit(50)
            ->get();

        return response()->json($dados);
    }

    // Alertas de demanda que batem com os lotes do produtor
    public function alertasMatchLotes(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 404);

        $lotes = $fazenda->lotes()->where('status', 'disponivel')->get();

        $matches = collect();

        foreach ($lotes as $lote) {
            $buscas = BuscaLog::where('created_at', '>=', now()->subDays(7))
                ->when($lote->raca, fn($q) => $q->where('raca', $lote->raca))
                ->where('estado', $fazenda->estado)
                ->count();

            if ($buscas > 0) {
                $matches->push([
                    'lote'   => $lote->only(['id', 'nome', 'raca', 'qtd_cabecas', 'categoria']),
                    'buscas' => $buscas,
                ]);
            }
        }

        return response()->json($matches->sortByDesc('buscas')->values());
    }

    // Onde há oferta: contagem de anúncios ativos por estado/raça
    public function ofertaRegioes(Request $request)
    {
        $dados = Anuncio::join('animais', 'animais.id', '=', 'anuncios.animal_id')
            ->whereNull('anuncios.deleted_at')
            ->whereNull('animais.deleted_at')
            ->where('animais.status', 'disponivel')
            ->where(fn($q) => $q->whereNull('anuncios.expira_em')->orWhere('anuncios.expira_em', '>', now()))
            ->when($request->raca, fn($q) => $q->where('animais.raca', $request->raca))
            ->when($request->estado, fn($q) => $q->where('animais.estado', $request->estado))
            ->selectRaw('animais.estado, animais.raca, COUNT(anuncios.id) as anuncios, SUM(animais.quantidade) as cabecas')
            ->groupBy('animais.estado', 'animais.raca')
            ->orderByDesc('anuncios')
            ->limit(30)
            ->get();

        return response()->json($dados);
    }

    // Oportunidades: anúncios com melhor preço e negociação aberta
    public function oportunidades(Request $request)
    {
        $dados = Anuncio::join('animais', 'animais.id', '=', 'anuncios.animal_id')
            ->whereNull('anuncios.deleted_at')
            ->whereNull('animais.deleted_at')
            ->where('animais.status', 'disponivel')
            ->where(fn($q) => $q->whereNull('anuncios.expira_em')->orWhere('anuncios.expira_em', '>', now()))
            ->where('anuncios.aceita_negociacao', true)
            ->when($request->raca, fn($q) => $q->where('animais.raca', $request->raca))
            ->when($request->estado, fn($q) => $q->where('animais.estado', $request->estado))
            ->select([
                'anuncios.id', 'anuncios.titulo', 'anuncios.preco_unitario', 'anuncios.created_at',
                'animais.raca', 'animais.estado', 'animais.municipio', 'animais.quantidade', 'animais.peso_estimado',
            ])
            ->orderBy('anuncios.preco_unitario')
            ->limit(12)
            ->get();

        return response()->json($dados);
    }
}
