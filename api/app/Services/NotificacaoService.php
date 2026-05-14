<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class NotificacaoService
{
    public static function enviar(
        int $userId,
        string $tipo,
        string $titulo,
        string $corpo = '',
        ?string $link = null
    ): void {
        DB::table('notificacoes')->insert([
            'user_id'    => $userId,
            'tipo'       => $tipo,
            'titulo'     => $titulo,
            'corpo'      => $corpo,
            'link'       => $link,
            'lida'       => false,
            'created_at' => now(),
        ]);
    }

    // ── Atalhos por tipo ──────────────────────────────────────────────────────

    public static function novaNegociacao(int $vendedorId, string $compradorNome, string $produtoNome, int $negociacaoId): void
    {
        static::enviar(
            $vendedorId,
            'nova_negociacao',
            "Nova proposta de {$compradorNome}",
            "Interesse em: {$produtoNome}",
            "/chat/{$negociacaoId}"
        );
    }

    public static function novaMensagemNegociacao(int $destinatarioId, string $remetenteNome, int $negociacaoId): void
    {
        static::enviar(
            $destinatarioId,
            'mensagem_negociacao',
            "Mensagem de {$remetenteNome}",
            'Nova mensagem na sua negociação',
            "/chat/{$negociacaoId}"
        );
    }

    public static function respostaSuporte(int $userId, string $remetente = 'Suporte Bovino'): void
    {
        static::enviar(
            $userId,
            'suporte_resposta',
            "Resposta de {$remetente}",
            'Você tem uma nova mensagem no suporte',
            '/gestao/suporte'
        );
    }

    public static function alertaSaude(int $userId, int $quantidade): void
    {
        static::enviar(
            $userId,
            'alerta_saude',
            "{$quantidade} alerta" . ($quantidade > 1 ? 's' : '') . " de saúde",
            'Vacinas ou doses próximas do vencimento',
            '/gestao/saude'
        );
    }

    public static function pagamentoConfirmado(int $userId, string $plano): void
    {
        static::enviar(
            $userId,
            'pagamento',
            'Pagamento confirmado',
            "Seu plano {$plano} está ativo",
            '/gestao'
        );
    }
}
