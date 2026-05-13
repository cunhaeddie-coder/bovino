<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupportChatController extends Controller
{
    // ── Retorna ou cria conversa aberta ───────────────────────────────────────

    public function conversa(Request $request): JsonResponse
    {
        $user    = $request->user();
        $fazenda = $user->fazenda;

        $conversa = DB::table('suporte_conversas')
            ->where('user_id', $user->id)
            ->whereIn('status', ['aberta', 'em_atendimento', 'escalada'])
            ->orderByDesc('created_at')
            ->first();

        if (!$conversa) {
            return response()->json(['conversa' => null, 'mensagens' => []]);
        }

        $mensagens = DB::table('suporte_mensagens')
            ->where('conversa_id', $conversa->id)
            ->orderBy('created_at')
            ->get(['papel', 'conteudo', 'created_at']);

        return response()->json(['conversa' => $conversa, 'mensagens' => $mensagens]);
    }

    // ── Envia mensagem e obtém resposta da IA ─────────────────────────────────

    public function enviar(Request $request): JsonResponse
    {
        $user    = $request->user();
        $fazenda = $user->fazenda;

        $data = $request->validate([
            'mensagem'     => ['required', 'string', 'max:2000'],
            'conversa_id'  => ['nullable', 'integer'],
        ]);

        // Obtém ou cria conversa
        $conversaId = $data['conversa_id'] ?? null;

        if ($conversaId) {
            $conversa = DB::table('suporte_conversas')
                ->where('id', $conversaId)
                ->where('user_id', $user->id)
                ->first();
        } else {
            $conversa = null;
        }

        if (!$conversa) {
            $conversaId = DB::table('suporte_conversas')->insertGetId([
                'user_id'      => $user->id,
                'user_nome'    => $user->nome,
                'user_plano'   => $user->plano ?? 'free',
                'fazenda_nome' => $fazenda?->nome,
                'status'       => 'aberta',
                'resumo'       => mb_substr($data['mensagem'], 0, 200),
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        } else {
            $conversaId = $conversa->id;
        }

        // Salva mensagem do usuário
        DB::table('suporte_mensagens')->insert([
            'conversa_id' => $conversaId,
            'papel'       => 'usuario',
            'conteudo'    => $data['mensagem'],
            'created_at'  => now(),
        ]);

        // Se conversa escalada/em_atendimento, não chama IA
        if ($conversa && in_array($conversa->status, ['em_atendimento', 'escalada'])) {
            DB::table('suporte_conversas')
                ->where('id', $conversaId)
                ->update(['updated_at' => now()]);

            return response()->json([
                'conversa_id' => $conversaId,
                'resposta'    => null,
                'atendimento_humano' => true,
            ]);
        }

        // Chama IA
        $resposta = $this->chamarIA($user, $fazenda, $conversaId, $data['mensagem']);

        // Detecta se a IA não soube responder → escalar
        $deveEscalar = $this->deveEscalar($resposta);

        DB::table('suporte_mensagens')->insert([
            'conversa_id' => $conversaId,
            'papel'       => 'ia',
            'conteudo'    => $resposta,
            'created_at'  => now(),
        ]);

        if ($deveEscalar) {
            DB::table('suporte_conversas')
                ->where('id', $conversaId)
                ->update(['status' => 'escalada', 'updated_at' => now()]);
        } else {
            DB::table('suporte_conversas')
                ->where('id', $conversaId)
                ->update(['updated_at' => now()]);
        }

        return response()->json([
            'conversa_id'        => $conversaId,
            'resposta'           => $resposta,
            'escalada'           => $deveEscalar,
            'atendimento_humano' => false,
        ]);
    }

    // ── Nova conversa (encerra a atual se existir) ────────────────────────────

    public function nova(Request $request): JsonResponse
    {
        $user = $request->user();

        // Fecha conversas anteriores abertas
        DB::table('suporte_conversas')
            ->where('user_id', $user->id)
            ->whereIn('status', ['aberta'])
            ->update(['status' => 'resolvida', 'updated_at' => now()]);

        return response()->json(['ok' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function chamarIA($user, $fazenda, int $conversaId, string $mensagem): string
    {
        $apiKey = config('services.anthropic.key');
        if (!$apiKey) return 'Serviço de IA temporariamente indisponível. Um atendente humano irá responder em breve.';

        // Histórico da conversa (últimas 10 mensagens para contexto)
        $historico = DB::table('suporte_mensagens')
            ->where('conversa_id', $conversaId)
            ->whereIn('papel', ['usuario', 'ia'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->reverse()
            ->values();

        $mensagens = [];
        foreach ($historico as $m) {
            if ($m->papel === 'ia') continue; // a última já está como $mensagem
            $mensagens[] = ['role' => 'user', 'content' => $m->conteudo];
        }
        $mensagens[] = ['role' => 'user', 'content' => $mensagem];

        // Reconstituir o par user/assistant para o histórico
        $mensagensFormatadas = [];
        $msgHistorico = DB::table('suporte_mensagens')
            ->where('conversa_id', $conversaId)
            ->whereIn('papel', ['usuario', 'ia'])
            ->orderBy('created_at')
            ->get();

        foreach ($msgHistorico as $m) {
            $role = $m->papel === 'usuario' ? 'user' : 'assistant';
            $mensagensFormatadas[] = ['role' => $role, 'content' => $m->conteudo];
        }
        // Adiciona a mensagem atual
        $mensagensFormatadas[] = ['role' => 'user', 'content' => $mensagem];

        $plano      = $user->plano ?? 'free';
        $fazendaNome = $fazenda?->nome ?? 'não configurada';

        $systemPrompt = <<<PROMPT
Você é o assistente de suporte do Bovino, plataforma SaaS de gestão pecuária e marketplace de gado.

USUÁRIO ATUAL:
- Nome: {$user->nome}
- Plano: {$plano}
- Fazenda: {$fazendaNome}

SOBRE O BOVINO:
- Marketplace: produtores anunciam gado, compradores encontram e negociam
- Gestão pecuária: rebanho, lotes, saúde, pesagens, reprodução, insumos, financeiro, fiscal
- Módulo leiteiro: controle diário de produção de leite
- App Vaqueiro: uso no campo (pasto, curral)
- IA Gestor: assistente de manejo baseado nos dados da fazenda

PLANOS DISPONÍVEIS:
- Premium: R$150/mês — acesso completo à gestão
- Elite R$280: até 500 cabeças
- Elite R$330: até 1.000 cabeças
- Elite R$420: até 2.000 cabeças
- Elite R$550: acima de 2.000 cabeças
- Todos os planos anuais: paga 11 meses, usa 12

REGRAS:
1. Responda sempre em português brasileiro, de forma direta e objetiva
2. Seja simpático mas profissional
3. Se não souber a resposta com certeza, diga: "Vou encaminhar sua dúvida para a nossa equipe"
4. Nunca invente funcionalidades ou preços diferentes dos informados
5. Para problemas técnicos que precisam de investigação, diga que vai escalar para a equipe
PROMPT;

        try {
            $response = Http::timeout(30)->withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-haiku-4-5-20251001',
                'max_tokens' => 512,
                'system'     => $systemPrompt,
                'messages'   => $mensagensFormatadas,
            ]);

            if (!$response->successful()) {
                Log::error('Suporte IA error', ['status' => $response->status()]);
                return 'Desculpe, estou com dificuldades técnicas no momento. Vou encaminhar sua mensagem para a equipe.';
            }

            return $response->json('content.0.text', 'Não consegui processar sua mensagem. Vou encaminhar para a equipe.');
        } catch (\Throwable $e) {
            Log::error('Suporte IA exception', ['error' => $e->getMessage()]);
            return 'Serviço temporariamente indisponível. Um atendente irá responder em breve.';
        }
    }

    private function deveEscalar(string $resposta): bool
    {
        $triggers = [
            'vou encaminhar',
            'encaminhar sua',
            'equipe irá',
            'atendente irá',
            'não tenho certeza',
        ];

        $respostaLower = mb_strtolower($resposta);
        foreach ($triggers as $t) {
            if (str_contains($respostaLower, $t)) return true;
        }

        return false;
    }
}
