<?php

namespace App\Http\Controllers\Api;

use App\Events\NovaNegociacao;
use App\Events\TransacaoConfirmada;
use App\Http\Controllers\Controller;
use App\Services\NotificacaoService;
use App\Http\Requests\Negociacao\StoreNegociacaoRequest;
use App\Models\Anuncio;
use App\Models\Mensagem;
use App\Models\Negociacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NegociacaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $negociacoes = Negociacao::with([
            'anuncio:id,titulo,preco_unitario',
            'comprador:id,nome',
            'vendedor:id,nome',
            'mensagens' => fn($q) => $q->latest()->limit(1),
        ])
            ->where(fn($q) => $q->where('comprador_id', $userId)->orWhere('vendedor_id', $userId))
            ->latest()
            ->paginate(20);

        return response()->json($negociacoes);
    }

    public function show(Request $request, Negociacao $negociacao): JsonResponse
    {
        $userId = $request->user()->id;

        if ($negociacao->comprador_id !== $userId && $negociacao->vendedor_id !== $userId) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        Mensagem::where('negociacao_id', $negociacao->id)
            ->where('remetente_id', '!=', $userId)
            ->whereNull('lido_em')
            ->update(['lido_em' => now()]);

        return response()->json($negociacao->load([
            'anuncio.animal',
            'comprador:id,nome,celular',
            'vendedor:id,nome,celular',
            'mensagens.remetente:id,nome',
        ]));
    }

    public function store(StoreNegociacaoRequest $request): JsonResponse
    {
        $data        = $request->validated();
        $anuncio     = Anuncio::findOrFail($data['anuncio_id']);
        $compradorId = $request->user()->id;

        $negociacao = Negociacao::create([
            'anuncio_id' => $anuncio->id,
            'comprador_id' => $compradorId,
            'vendedor_id' => $anuncio->user_id,
            'preco_proposto' => $data['preco_proposto'] ?? $anuncio->preco_unitario,
            'mensagem_inicial' => $data['mensagem_inicial'] ?? null,
        ]);

        if (!empty($data['mensagem_inicial'])) {
            Mensagem::create([
                'negociacao_id' => $negociacao->id,
                'remetente_id' => $compradorId,
                'corpo' => $data['mensagem_inicial'],
            ]);
        }

        NovaNegociacao::dispatch($negociacao);

        // Notifica o vendedor
        NotificacaoService::novaNegociacao(
            $anuncio->user_id,
            $request->user()->nome,
            $anuncio->titulo ?? 'seu anúncio',
            $negociacao->id
        );

        return response()->json($negociacao->load('anuncio'), 201);
    }

    public function atualizarStatus(Request $request, Negociacao $negociacao): JsonResponse
    {
        $userId = $request->user()->id;
        $isVendedor  = $negociacao->vendedor_id  === $userId;
        $isComprador = $negociacao->comprador_id === $userId;

        if (!$isVendedor && !$isComprador) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate([
            'status' => ['required', 'in:aceita,recusada,concluida'],
        ]);

        if ($data['status'] === 'concluida' && !$isVendedor) {
            return response()->json(['message' => 'Apenas o vendedor pode concluir a negociação.'], 403);
        }

        $negociacao->update(['status' => $data['status']]);

        if ($data['status'] === 'concluida') {
            $negociacao->anuncio->animal->update(['status' => 'vendido']);
            TransacaoConfirmada::dispatch($negociacao);
        }

        $destinatario = $isVendedor ? $negociacao->comprador_id : $negociacao->vendedor_id;
        $labels = ['aceita' => 'aceita', 'recusada' => 'recusada', 'concluida' => 'concluída'];
        NotificacaoService::enviar(
            $destinatario, 'negociacao',
            'Negociação ' . ($labels[$data['status']] ?? $data['status']),
            $request->user()->nome . ' ' . ($data['status'] === 'aceita' ? 'aceitou a proposta' : ($data['status'] === 'recusada' ? 'recusou a proposta' : 'concluiu a negociação')),
            "/chat/{$negociacao->id}"
        );

        return response()->json($negociacao);
    }

    public function contraPropostar(Request $request, Negociacao $negociacao): JsonResponse
    {
        $userId = $request->user()->id;

        if ($negociacao->comprador_id !== $userId && $negociacao->vendedor_id !== $userId) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($negociacao->status !== 'aberta') {
            return response()->json(['message' => 'Negociação não está aberta.'], 422);
        }

        $data = $request->validate([
            'preco_contra_proposta' => ['required', 'numeric', 'min:0'],
            'cotacao_arroba_momento' => ['nullable', 'numeric', 'min:0'],
        ]);

        $de = $negociacao->vendedor_id === $userId ? 'vendedor' : 'comprador';

        $negociacao->update([
            'preco_contra_proposta'  => $data['preco_contra_proposta'],
            'contra_proposta_de'     => $de,
            'cotacao_arroba_momento' => $data['cotacao_arroba_momento'] ?? null,
        ]);

        $preco = 'R$ ' . number_format($data['preco_contra_proposta'], 2, ',', '.');
        Mensagem::create([
            'negociacao_id' => $negociacao->id,
            'remetente_id'  => $userId,
            'corpo'         => "💰 Contra-proposta: {$preco}/cab",
        ]);

        $destinatario = $userId === $negociacao->comprador_id
            ? $negociacao->vendedor_id
            : $negociacao->comprador_id;

        NotificacaoService::enviar(
            $destinatario, 'negociacao',
            'Nova contra-proposta',
            $request->user()->nome . " propôs {$preco}/cab",
            "/chat/{$negociacao->id}"
        );

        return response()->json($negociacao->fresh()->load(['mensagens.remetente:id,nome']));
    }

    public function mensagens(Request $request, Negociacao $negociacao): JsonResponse
    {
        $userId = $request->user()->id;

        if ($negociacao->comprador_id !== $userId && $negociacao->vendedor_id !== $userId) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        return response()->json(
            $negociacao->mensagens()->with('remetente:id,nome')->paginate(50)
        );
    }

    public function enviarMensagem(Request $request, Negociacao $negociacao): JsonResponse
    {
        $userId = $request->user()->id;

        if ($negociacao->comprador_id !== $userId && $negociacao->vendedor_id !== $userId) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($negociacao->status === 'concluida' || $negociacao->status === 'recusada') {
            return response()->json(['message' => 'Negociação encerrada.'], 422);
        }

        $data = $request->validate([
            'corpo' => ['required', 'string', 'max:2000'],
        ]);

        $mensagem = Mensagem::create([
            'negociacao_id' => $negociacao->id,
            'remetente_id' => $userId,
            'corpo' => $data['corpo'],
        ]);

        // Notifica o outro participante
        $destinatario = $userId === $negociacao->comprador_id
            ? $negociacao->vendedor_id
            : $negociacao->comprador_id;

        NotificacaoService::novaMensagemNegociacao(
            $destinatario,
            $request->user()->nome,
            $negociacao->id
        );

        return response()->json($mensagem->load('remetente:id,nome'), 201);
    }
}
