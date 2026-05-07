<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConversaIA;
use App\Models\Fazenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GestaoIAController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function chat(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data    = $request->validate([
            'mensagem' => ['required','string','max:2000'],
            'tipo'     => ['nullable','in:texto,audio'],
            'historico'=> ['nullable','array'],
        ]);

        $apiKey = config('services.anthropic.key');
        if (!$apiKey) {
            return response()->json(['error' => 'IA não configurada.'], 503);
        }

        // Contexto da fazenda para a IA
        $rebanhoTotal   = \App\Models\Rebanho::where('fazenda_id', $fazenda->id)->where('status','ativo')->count();
        $alertasSaude   = \App\Models\EventoSaude::whereHas('animal', fn($q) => $q->where('fazenda_id', $fazenda->id))
            ->where('proxima_dose', '<=', now()->addDays(30))->count();
        $eventosAbertos = \App\Models\EventoCampo::where('fazenda_id', $fazenda->id)->where('resolvido', false)->count();

        $systemPrompt = <<<PROMPT
Você é o Assistente Pecuário da Bovino, uma IA especializada em pecuária bovina.
Você tem acesso ao contexto atual da fazenda "{$fazenda->nome}" ({$fazenda->estado}):
- Rebanho total: {$rebanhoTotal} animais ativos
- Alertas de saúde nos próximos 30 dias: {$alertasSaude}
- Eventos de campo não resolvidos: {$eventosAbertos}

Responda de forma objetiva, prática e técnica. Use linguagem acessível para produtores rurais.
Para dúvidas sobre manejo, nutrição, saúde ou gestão, baseie-se em boas práticas pecuárias brasileiras.
Quando perguntado sobre relatórios ou dados específicos, informe que pode buscar esses dados no sistema.
Responda sempre em português brasileiro.
PROMPT;

        $mensagens = [];
        foreach ($request->input('historico', []) as $h) {
            $mensagens[] = ['role' => $h['role'], 'content' => $h['content']];
        }
        $mensagens[] = ['role' => 'user', 'content' => $data['mensagem']];

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => 1024,
            'system'     => $systemPrompt,
            'messages'   => $mensagens,
        ]);

        if (!$response->successful()) {
            \Illuminate\Support\Facades\Log::error('Anthropic API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return response()->json(['error' => 'Erro ao contatar IA: ' . $response->status()], 502);
        }

        $resposta = $response->json('content.0.text', 'Não consegui processar sua mensagem.');

        ConversaIA::create([
            'fazenda_id' => $fazenda->id,
            'user_id'    => $request->user()->id,
            'mensagem'   => $data['mensagem'],
            'resposta'   => $resposta,
            'tipo'       => $data['tipo'] ?? 'texto',
        ]);

        return response()->json(['resposta' => $resposta]);
    }

    public function historico(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            ConversaIA::where('fazenda_id', $fazenda->id)
                ->where('user_id', $request->user()->id)
                ->orderByDesc('created_at')
                ->limit(50)->get(['id','mensagem','resposta','tipo','created_at'])
        );
    }

    public function valorRebanho(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $animais = \App\Models\Rebanho::where('fazenda_id', $fazenda->id)
            ->where('status', 'ativo')
            ->select('categoria', 'sexo', 'peso_atual')
            ->get();

        // Preço médio da @arroba por categoria (usando cotação mais recente)
        $cotacao = \App\Models\Cotacao::where('tipo', 'boi_gordo')
            ->orderByDesc('created_at')->value('preco_arroba') ?? 230.00;

        $valorTotal = 0;
        $detalhes   = [];

        $fatorCategoria = [
            'boi'     => 1.0,
            'touro'   => 1.2,
            'vaca'    => 0.85,
            'novilho' => 0.9,
            'novilha' => 0.8,
            'bezerro' => 0.7,
            'bezerra' => 0.65,
        ];

        foreach ($animais->groupBy('categoria') as $cat => $grupo) {
            $fator   = $fatorCategoria[$cat] ?? 0.8;
            $arroba  = $cotacao * $fator;
            $qtd     = $grupo->count();
            $pesoMed = $grupo->avg('peso_atual') ?? 400;
            $arrobaAnimal = $pesoMed / 15;
            $valorGrupo  = $qtd * $arrobaAnimal * $arroba;
            $valorTotal  += $valorGrupo;

            $detalhes[] = [
                'categoria'    => $cat,
                'quantidade'   => $qtd,
                'peso_medio'   => round($pesoMed, 1),
                'valor_arroba' => $arroba,
                'valor_total'  => round($valorGrupo, 2),
            ];
        }

        return response()->json([
            'valor_total_rebanho' => round($valorTotal, 2),
            'total_animais'       => $animais->count(),
            'cotacao_arroba'      => $cotacao,
            'data_cotacao'        => now()->toDateString(),
            'detalhes'            => $detalhes,
        ]);
    }
}
